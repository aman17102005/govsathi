import type { Facts, Scheme, SchemeCategory } from '@govsathi/shared';
import { evaluate, type EligibilityResult } from '@govsathi/eligibility';
import { CONCEPTS, STOPWORDS } from './lexicon';

export { CONCEPTS } from './lexicon';

/**
 * Lexical retrieval over character trigrams (BM25) plus lexicon concepts.
 * Why trigrams: Indian-language words inflect heavily and Roman spellings vary ("kisan"/"kisaan"/"kisaan"),
 * so exact-word matching misses obvious matches. Trigrams give fuzzy, stem-free, script-agnostic matching.
 * Semantic (embedding) ranking can be fused on top by the server; this layer works with no network at all.
 */

export interface Hit {
  schemeId: string;
  score: number;
  /** Categories that the query's concepts pointed at and this scheme belongs to. */
  topics: SchemeCategory[];
}

export type Vocab = Record<string, string>;

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
const LATIN_ONLY = /^[a-z0-9]+$/;

/** Normalise Roman spellings so "kisaan", "kissan" and "kisan" collide. Applied to docs and queries alike. */
function normalizeWord(w: string): string {
  let x = w.normalize('NFKC').toLowerCase();
  x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip Latin diacritics only matters for Latin; harmless otherwise
  x = x.normalize('NFC');
  if (LATIN_ONLY.test(x)) {
    x = x.replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/(.)\1+/g, '$1');
  }
  return x;
}

export function words(text: string): string[] {
  return (text.match(WORD) ?? []).map(normalizeWord).filter(Boolean);
}

const STOP = new Set([...STOPWORDS].map(normalizeWord));
const contentWords = (text: string) => words(text).filter((w) => !STOP.has(w));

export function ngrams(word: string): string[] {
  const padded = `_${word}_`;
  if (padded.length <= 3) return [padded];
  const out: string[] = [];
  for (let i = 0; i <= padded.length - 3; i++) out.push(padded.slice(i, i + 3));
  return out;
}

const tokens = (text: string) => words(text).flatMap(ngrams);

interface Doc {
  id: string;
  tf: Map<string, number>;
  len: number;
  categories: SchemeCategory[];
}

export interface Index {
  docs: Doc[];
  df: Map<string, number>;
  avgLen: number;
  search: (query: string, limit?: number) => Hit[];
  concepts: (query: string) => SchemeCategory[];
}

function schemeText(s: Scheme, vocabs: Vocab[]): string {
  const parts: string[] = [];
  const push = (text: string, weight: number) => {
    for (let i = 0; i < weight; i++) parts.push(text);
  };
  push(s.names.en, 3);
  if (s.names.hi) push(s.names.hi, 3);
  push(s.keywords.join(' '), 3);
  push(s.department, 1);
  for (const c of s.categories) {
    push(c.replace(/_/g, ' '), 2);
    for (const v of vocabs) if (v[`cat.${c}`]) push(v[`cat.${c}`]!, 2);
  }
  for (const b of s.benefits) for (const v of vocabs) if (v[`benefit.${b.type}.none`]) push(v[`benefit.${b.type}.none`]!, 1);
  // Values the scheme targets, in every loaded language (e.g. "farmer", "किसान", "ਕਿਸਾਨ").
  const values = new Set<string>();
  for (const r of s.rules) {
    const simple = r.rule ? [r.rule] : (r.anyOf ?? []).flatMap((a) => ('all' in a ? a.all : [a]));
    for (const x of simple) if (Array.isArray(x.value) && x.fact !== 'age') for (const v of x.value) values.add(String(v));
  }
  for (const val of values) for (const v of vocabs) if (v[`opt.${val}`]) push(v[`opt.${val}`]!, 1);
  return parts.join(' ');
}

export function buildIndex(schemes: readonly Scheme[], vocabs: readonly Vocab[] = []): Index {
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  for (const s of schemes) {
    const tf = new Map<string, number>();
    const toks = tokens(schemeText(s, [...vocabs]));
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    docs.push({ id: s.id, tf, len: toks.length, categories: s.categories });
  }
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  const N = docs.length;

  const conceptWeights = (query: string): Map<SchemeCategory, number> => {
    const q = new Set(words(query));
    const joined = ` ${[...q].join(' ')} `;
    const cats = new Map<SchemeCategory, number>();
    for (const c of CONCEPTS) {
      const hit = c.triggers.some((t) => {
        const n = normalizeWord(t);
        return q.has(n) || (n.length >= 4 && joined.includes(n)); // substring catches inflections ("किसानों")
      });
      if (hit) for (const x of c.categories) cats.set(x, Math.max(cats.get(x) ?? 0, c.weight ?? 1));
    }
    return cats;
  };
  const concepts = (query: string): SchemeCategory[] => [...conceptWeights(query).keys()];

  const search = (query: string, limit = 30): Hit[] => {
    const qTokens = contentWords(query).flatMap(ngrams);
    const cats = conceptWeights(query);
    if (qTokens.length === 0) return [];
    const k1 = 1.2;
    const b = 0.75;
    const raw: { d: Doc; s: number }[] = [];
    const uniq = new Map<string, number>();
    for (const t of qTokens) uniq.set(t, (uniq.get(t) ?? 0) + 1);
    for (const d of docs) {
      let s = 0;
      for (const [t, qf] of uniq) {
        const f = d.tf.get(t);
        if (!f) continue;
        const n = df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgLen))) * Math.min(qf, 2);
      }
      raw.push({ d, s });
    }
    const max = Math.max(...raw.map((r) => r.s), 0);
    const hits: Hit[] = [];
    for (const { d, s } of raw) {
      const topics = d.categories.filter((c) => cats.has(c));
      const lexical = max > 0 ? s / max : 0;
      const topicBoost = topics.length > 0 ? 0.5 * Math.max(...topics.map((c) => cats.get(c)!)) : 0;
      const score = lexical * 0.6 + topicBoost;
      if (score >= 0.3) hits.push({ schemeId: d.id, score, topics });
    }
    return hits.sort((a, b2) => b2.score - a.score).slice(0, limit);
  };

  return { docs, df, avgLen, search, concepts };
}

/** Reciprocal-rank fusion of ranked id lists (used to merge lexical and embedding rankings). */
export function fuseRankings(rankings: readonly (readonly string[])[], k = 60): Map<string, number> {
  const out = new Map<string, number>();
  for (const list of rankings) list.forEach((id, i) => out.set(id, (out.get(id) ?? 0) + 1 / (k + i + 1)));
  return out;
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export interface Ranked {
  scheme: Scheme;
  result: EligibilityResult;
  score: number;
  topics: SchemeCategory[];
}

const ELIGIBILITY_BONUS: Record<string, number> = {
  potentially_eligible: 0.6, potential_match: 0.4, more_info_required: 0.2, informational_only: 0.1, some_criteria_do_not_match: 0,
};

/** How specific the matched criteria are: "age 18+" says little; a targeted rule (a category, a state, a status) says a lot. */
function specificity(s: Scheme, r: EligibilityResult): number {
  let sum = 0;
  for (const rule of s.rules) {
    if (!r.matchedRuleIds.includes(rule.id)) continue;
    const trivial = rule.rule?.fact === 'age' && rule.rule.op === 'gte' && Number(rule.rule.value) <= 18;
    sum += trivial ? 0.25 : rule.anyOf ? 1.5 : 1;
  }
  if (s.stateCodes.length > 0 && r.matchedRuleIds.includes('__state')) sum += 0.5;
  return sum;
}

/**
 * Eligibility filtering + re-ranking, shared by the server and the offline client fallback.
 * Criteria that definitely fail push a scheme to the end. Otherwise relevance to the question (or, with no question,
 * the specificity of what matched) is combined with how complete the eligibility match is. No opaque "best scheme"
 * score is ever shown to the citizen; this only decides the order.
 */
export function rankSchemes(
  candidates: readonly { scheme: Scheme; score: number; topics: SchemeCategory[] }[],
  facts: Facts,
  hasQuery: boolean,
): Ranked[] {
  const out = candidates.map((c) => {
    const result = evaluate(c.scheme, facts);
    const unknownHard = result.rules.filter((x) => x.hard && x.outcome === 'unknown').length;
    const bonus = ELIGIBILITY_BONUS[result.status] ?? 0;
    const total = hasQuery ? c.score + bonus : specificity(c.scheme, result) + bonus - 0.15 * unknownHard;
    return { ...c, result, total };
  });
  out.sort((a, b) => {
    if (a.result.excluded !== b.result.excluded) return a.result.excluded ? 1 : -1;
    return b.total - a.total;
  });
  return out;
}

/** Fully offline search used when the server is unreachable. */
export function searchLocally(index: Index, schemes: readonly Scheme[], query: string, facts: Facts): Ranked[] {
  const byId = new Map(schemes.map((s) => [s.id, s]));
  const hits = query.trim()
    ? index.search(query, 40).map((h) => ({ scheme: byId.get(h.schemeId)!, score: h.score, topics: h.topics }))
    : schemes.map((scheme) => ({ scheme, score: 0, topics: [] as SchemeCategory[] }));
  return rankSchemes(hits.filter((h) => h.scheme), facts, query.trim() !== '');
}
