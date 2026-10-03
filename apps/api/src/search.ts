import { FACT_NAMES, SCHEME_CATEGORIES, getLanguage, isoDay, isRecommendable, type FactName, type Facts, type LanguageCode, type Scheme, type SchemeCategory } from '@govsathi/shared';
import { pickFollowUpFact, type EligibilityStatus } from '@govsathi/eligibility';
import { buildIndex, rankSchemes, type Index } from '@govsathi/retrieval';
import type { Corpus } from './data';
import { LlmAuthError, LlmConfigError, LlmQuotaError, type LlmProvider } from './llm';
import { ANSWER_SCHEMA, UNDERSTAND_SCHEMA, buildAnswerPrompt, buildUnderstandPrompt, validateAnswer, validateUnderstanding, type Candidate } from './rag';

export interface SearchRequest {
  query: string;
  language: LanguageCode;
  facts: Facts;
  skipped: string[];
}

export interface SearchResult {
  schemeId: string;
  score: number;
  status: EligibilityStatus;
  excluded: boolean;
  /** AI-written explanation in the citizen's language; only present if it passed validation. */
  why?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  intro?: string;
  followUpFact?: FactName;
  topics: SchemeCategory[];
  /** Whether the citizen supplied their own AI provider for this request. */
  aiConfigured: boolean;
  /** Only set when a configured provider failed; never set merely because no provider is configured. */
  degraded: { ai?: 'unavailable' | 'quota' | 'invalid_key' | 'model' };
}

export interface Deps {
  corpus: Corpus;
  index: Index;
  /** Injectable clock (YYYY-MM-DD) so currentness is always evaluated against the real date, and testable. */
  today?: () => string;
  cache: Map<string, { at: number; value: unknown }>;
}

export function makeIndex(corpus: Corpus): Index {
  return buildIndex(corpus.schemes, Object.values(corpus.vocabs));
}

/** Minimal runtime validation of the request body: only known facts, only expected types, bounded sizes. */
export function parseRequest(body: unknown): SearchRequest | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid_body' };
  const b = body as Record<string, unknown>;
  const query = typeof b.query === 'string' ? b.query.trim() : '';
  if (query.length > 500) return { error: 'query_too_long' };
  const lang = b.language;
  try {
    if (typeof lang !== 'string') return { error: 'invalid_language' };
    getLanguage(lang as LanguageCode);
  } catch {
    return { error: 'invalid_language' };
  }
  if (!getLanguage(lang as LanguageCode)) return { error: 'invalid_language' };
  const facts: Facts = {};
  const rawFacts = (b.facts ?? {}) as Record<string, unknown>;
  if (typeof rawFacts !== 'object' || Array.isArray(rawFacts)) return { error: 'invalid_facts' };
  for (const [k, v] of Object.entries(rawFacts)) {
    if (!(FACT_NAMES as readonly string[]).includes(k)) return { error: 'invalid_facts' };
    if (typeof v === 'string' && v.length <= 40) facts[k as FactName] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) facts[k as FactName] = v;
    else if (typeof v === 'boolean') facts[k as FactName] = v;
    else if (v && typeof v === 'object' && typeof (v as { min?: unknown }).min === 'number') {
      const r = v as { min: number; max: number | null };
      facts[k as FactName] = { min: r.min, max: r.max === null || typeof r.max === 'number' ? r.max : null };
    } else return { error: 'invalid_facts' };
  }
  const skipped = Array.isArray(b.skipped) ? b.skipped.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  return { query, language: lang as LanguageCode, facts, skipped };
}

const CACHE_TTL = 10 * 60 * 1000;
function memo<T>(deps: Deps, key: string, make: () => Promise<T>): Promise<T> {
  const hit = deps.cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.value as T);
  return make().then((v) => {
    deps.cache.set(key, { at: Date.now(), value: v });
    if (deps.cache.size > 500) deps.cache.delete(deps.cache.keys().next().value!);
    return v;
  });
}

export async function runSearch(deps: Deps, req: SearchRequest, llm?: LlmProvider): Promise<SearchResponse> {
  const { corpus, index } = deps;
  const today = (deps.today ?? (() => isoDay(new Date())))();
  const current = (id: string) => { const sc = corpus.byId.get(id); return !!sc && isRecommendable(sc, today); };
  const degraded: SearchResponse['degraded'] = {};
  let ai: SearchResponse['degraded']['ai'];
  const noteAi = (e: unknown) => {
    ai = e instanceof LlmQuotaError ? 'quota' : e instanceof LlmAuthError ? 'invalid_key' : e instanceof LlmConfigError ? 'model' : 'unavailable';
  };

  // 1. Query understanding. Lexicon first (free); the LLM is only asked when the lexicon finds nothing.
  let searchText = req.query;
  let topics = index.concepts(req.query);
  if (req.query && topics.length === 0 && llm) {
    try {
      const p = buildUnderstandPrompt(req.query);
      const raw = await memo(deps, `u:${llm?.name}:${req.query}`, () => llm!.generateJson({ ...p, schema: UNDERSTAND_SCHEMA, maxOutputTokens: 200 }));
      const u = validateUnderstanding(raw);
      if (u) {
        searchText = `${req.query} ${u.englishQuery}`;
        const valid = u.categories.filter((c): c is SchemeCategory => (SCHEME_CATEGORIES as readonly string[]).includes(c));
        topics = [...new Set([...topics, ...valid, ...index.concepts(u.englishQuery)])];
      }
    } catch (e) {
      noteAi(e);
    }
  }

  // 2. Retrieval: lexical + concept search over the PUBLIC catalogue only. (Semantic embeddings are not used: they would need a
  //    shared provider key, which this project deliberately does not have.)
  const byId = corpus.byId;
  let ranked: { id: string; score: number; topics: SchemeCategory[] }[];
  if (!req.query) {
    ranked = corpus.schemes.map((sc) => ({ id: sc.id, score: 0, topics: [] }));
  } else {
    ranked = index.search(searchText, 40).map((h) => ({ id: h.schemeId, score: h.score, topics: h.topics }));
  }
  ranked = ranked.filter((r) => current(r.id));

  // 3. Eligibility filtering + re-ranking (deterministic).
  const cands = rankSchemes(
    ranked
      .map((r) => ({ scheme: byId.get(r.id) as Scheme | undefined, score: r.score, topics: r.topics }))
      .filter((x): x is { scheme: Scheme; score: number; topics: SchemeCategory[] } => !!x.scheme),
    req.facts,
    Boolean(req.query),
  );
  const top = cands.slice(0, 15);
  const prominent = top.filter((c) => !c.result.excluded).slice(0, 5);

  // 4. Grounded response (LLM), validated; failure is non-fatal and the UI falls back to templates.
  let answer: ReturnType<typeof validateAnswer> = null;
  if (prominent.length > 0 && llm) {
    const candidates: Candidate[] = prominent.map((c) => ({ scheme: c.scheme, result: c.result }));
    try {
      const p = buildAnswerPrompt(req.query, req.language, req.facts, candidates, corpus.en);
      const key = `a:${llm?.name}:${req.language}:${req.query}:${JSON.stringify(req.facts)}:${candidates.map((c) => c.scheme.id).join(',')}`;
      const raw = await memo(deps, key, () => llm!.generateJson({ ...p, schema: ANSWER_SCHEMA, maxOutputTokens: 1500 }));
      answer = validateAnswer(raw, candidates, req.language, req.facts, req.query, corpus.en);
      if (!answer) ai = ai ?? 'unavailable';
    } catch (e) {
      noteAi(e);
    }
  }
  if (ai) degraded.ai = ai;

  const followUpFact = pickFollowUpFact(prominent.map((c) => c.result), req.skipped);
  return {
    results: top.map((c) => ({
      schemeId: c.scheme.id,
      score: Math.round(c.score * 1000) / 1000,
      status: c.result.status,
      excluded: c.result.excluded,
      ...(answer?.why[c.scheme.id] ? { why: answer.why[c.scheme.id] } : {}),
    })),
    ...(answer?.intro ? { intro: answer.intro } : {}),
    ...(followUpFact ? { followUpFact } : {}),
    topics,
    aiConfigured: Boolean(llm),
    degraded,
  };
}
