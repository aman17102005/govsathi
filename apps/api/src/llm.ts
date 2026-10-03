/**
 * Provider abstraction. The application depends only on these interfaces. Each provider has its own adapter
 * (apps/api/src/ai/*.ts) that hides that provider's endpoint, auth scheme, structured-output format and quirks.
 * There is NO shared server-side key: every key is supplied by the user per request and never stored or logged.
 */
export class LlmQuotaError extends Error {
  override name = 'LlmQuotaError';
}
export class LlmUnavailableError extends Error {
  override name = 'LlmUnavailableError';
}
/** Bad request / unknown model / missing model access: a configuration problem, not an outage. */
export class LlmConfigError extends LlmUnavailableError {
  override name = 'LlmConfigError';
}
/** The provider rejected the key (invalid, revoked, wrong provider). */
export class LlmAuthError extends LlmUnavailableError {
  override name = 'LlmAuthError';
}
/** The provider has no documented way to do this (e.g. listing models). */
export class LlmUnsupportedError extends LlmUnavailableError {
  override name = 'LlmUnsupportedError';
}

export interface JsonRequest {
  system: string;
  user: string;
  /** Plain JSON Schema (lowercase types). Adapters translate it to what their provider accepts. */
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  generateJson(req: JsonRequest): Promise<unknown>;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[], task: 'document' | 'query'): Promise<number[][]>;
}

export interface ModelInfo {
  id: string;
  label?: string;
}

/** What an adapter actually implements (not what the provider could do). */
export interface ProviderCapabilities {
  structuredOutput: boolean;
  embeddings: boolean;
  /** Streaming is documented by providers but intentionally not implemented: answers are validated as a whole before display. */
  streaming: boolean;
  listModels: boolean;
}

export interface AiProvider extends LlmProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;
  listModels(): Promise<ModelInfo[]>;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<{ status: number; ok: boolean; json(): Promise<unknown> }>;

/** Removes any occurrence of a secret from text that might be logged or shown. */
export function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const s of secrets) if (s && s.length >= 6) out = out.split(s).join('[redacted]');
  return out;
}

const AUTH_HINT = /(api[ _-]?key|authenticat|unauthori[sz]ed|permission denied|invalid x-api-key|incorrect api key|credentials?)/i;

function errorText(body: unknown): string {
  try {
    const b = body as { error?: { message?: unknown; status?: unknown; code?: unknown; type?: unknown } | string; message?: unknown };
    if (typeof b.error === 'string') return b.error;
    return [b.error?.message, b.error?.status, b.error?.code, b.error?.type, b.message].filter((x) => typeof x === 'string').join(' ');
  } catch {
    return '';
  }
}

/** One place that turns an HTTP failure into the right typed error, with no secret ever in the message. */
export async function http(
  doFetch: FetchLike,
  method: 'GET' | 'POST',
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  secrets: string[],
): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await doFetch(url, { method, headers: { ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), signal: ctl.signal });
  } catch (e) {
    throw new LlmUnavailableError(`network error: ${redact((e as Error).message, secrets)}`);
  } finally {
    clearTimeout(timer);
  }
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = undefined;
  }
  if (res.ok) {
    if (parsed === undefined) throw new LlmUnavailableError('response body was not JSON');
    return parsed;
  }
  if (res.status === 429) throw new LlmQuotaError('rate limited / quota exceeded');
  if (res.status === 401 || res.status === 403 || ((res.status === 400 || res.status === 404) && AUTH_HINT.test(errorText(parsed)))) throw new LlmAuthError(`HTTP ${res.status}: the provider rejected the key`);
  if (res.status === 400 || res.status === 404 || res.status === 422) throw new LlmConfigError(`HTTP ${res.status}: request or model not accepted`);
  throw new LlmUnavailableError(`HTTP ${res.status}`);
}

/** JSON Schema -> strict-mode schema (all properties required, no extra properties), as OpenAI/Anthropic/xAI structured outputs expect. */
export function strictify(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictify);
  if (!schema || typeof schema !== 'object') return schema;
  const s = { ...(schema as Record<string, unknown>) };
  for (const k of ['properties', 'items']) {
    const v = s[k];
    if (k === 'properties' && v && typeof v === 'object') s[k] = Object.fromEntries(Object.entries(v as object).map(([n, x]) => [n, strictify(x)]));
    if (k === 'items') s[k] = strictify(v);
  }
  if (s.type === 'object' && s.properties) {
    s.additionalProperties = false;
    s.required = Object.keys(s.properties as object);
  }
  return s;
}

/** Picks a sensible default from a provider's own model list (we never hard-code model names). */
export function suggestModel(models: ModelInfo[], prefer: RegExp[]): string | undefined {
  for (const re of prefer) {
    const hit = models.find((m) => re.test(m.id));
    if (hit) return hit.id;
  }
  return models[0]?.id;
}
