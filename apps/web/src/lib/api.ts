import type { FactName, Facts, LanguageCode, SchemeCategory } from '@govsathi/shared';
import type { EligibilityStatus } from '@govsathi/eligibility';
import { aiHeaders, aiSettings, type AiSettings } from './aiSettings';

export interface ApiResult {
  schemeId: string;
  score: number;
  status: EligibilityStatus;
  excluded: boolean;
  why?: string;
}

export interface SearchResponse {
  results: ApiResult[];
  intro?: string;
  followUpFact?: FactName;
  topics: SchemeCategory[];
  aiConfigured?: boolean;
  degraded: { ai?: 'unavailable' | 'quota' | 'invalid_key' | 'model' };
}

export class ApiError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(code);
  }
}

/** The ONLY personal data sent to the server: the question and the derived facts (never name, DOB or district). */
export async function searchApi(body: { query: string; language: LanguageCode; facts: Facts; skipped: string[] }, signal?: AbortSignal): Promise<SearchResponse> {
  let res: Response;
  try {
    res = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json', ...aiHeaders(aiSettings.get()) }, body: JSON.stringify(body), signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('network');
  }
  if (!res.ok) {
    let code = 'search_failed';
    try {
      code = ((await res.json()) as { error?: { code?: string } }).error?.code ?? code;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(code, res.status);
  }
  return (await res.json()) as SearchResponse;
}

/** Client-side mirror of the server's input guard so the citizen sees the warning instantly. */
export function looksSensitive(text: string): boolean {
  const compact = text.replace(/[\s-]/g, '');
  return /\d{9,}/.test(compact) || /\b(password|passcode|otp|cvv)\b/i.test(text);
}

export interface ProviderInfo {
  id: string;
  name: string;
}

export async function fetchProviders(): Promise<ProviderInfo[]> {
  let res: Response;
  try {
    res = await fetch('/api/ai/providers', { cache: 'no-store' });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) throw new ApiError('search_failed', res.status);
  return ((await res.json()) as { providers: ProviderInfo[] }).providers.map((p) => ({ id: p.id, name: p.name }));
}

/** Checks the citizen's key (listing models is free) and returns the models it can use. */
export async function fetchModels(s: Pick<AiSettings, 'provider' | 'apiKey'>): Promise<{ models: { id: string; label?: string }[]; suggested?: string; unsupported?: boolean }> {
  let res: Response;
  try {
    res = await fetch('/api/ai/models', { method: 'POST', headers: aiHeaders({ ...s, model: '', remember: false }, false), cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) {
    let code = 'ai_unavailable';
    try {
      code = ((await res.json()) as { error?: { code?: string } }).error?.code ?? code;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(code, res.status);
  }
  return (await res.json()) as { models: { id: string; label?: string }[]; suggested?: string; unsupported?: boolean };
}
