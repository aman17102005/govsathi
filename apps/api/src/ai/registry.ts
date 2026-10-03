import { type AiProvider, type FetchLike, type ModelInfo } from '../llm';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OpenAiProvider } from './openai';
import { XaiProvider } from './xai';

export const PROVIDER_IDS = ['gemini', 'openai', 'anthropic', 'xai'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

export const PROVIDER_INFO: Record<ProviderId, { name: string; capabilities: AiProvider['capabilities'] }> = {
  gemini: { name: 'Google Gemini', capabilities: { structuredOutput: true, embeddings: true, streaming: false, listModels: true } },
  openai: { name: 'OpenAI', capabilities: { structuredOutput: true, embeddings: false, streaming: false, listModels: true } },
  anthropic: { name: 'Anthropic Claude', capabilities: { structuredOutput: true, embeddings: false, streaming: false, listModels: true } },
  xai: { name: 'xAI Grok', capabilities: { structuredOutput: true, embeddings: false, streaming: false, listModels: true } },
};

export const isProviderId = (v: unknown): v is ProviderId => typeof v === 'string' && (PROVIDER_IDS as readonly string[]).includes(v);

export type ProviderFactory = (cfg: ProviderConfig, doFetch?: FetchLike) => AiProvider;

/** Adding a provider = write an adapter in ./ and add one line here (and to PROVIDER_IDS / PROVIDER_INFO). */
export const createProvider: ProviderFactory = (cfg, doFetch) => {
  switch (cfg.provider) {
    case 'gemini': return new GeminiProvider(cfg.apiKey, cfg.model, undefined, undefined, doFetch);
    case 'openai': return new OpenAiProvider(cfg.apiKey, cfg.model, undefined, doFetch);
    case 'anthropic': return new AnthropicProvider(cfg.apiKey, cfg.model, undefined, doFetch);
    case 'xai': return new XaiProvider(cfg.apiKey, cfg.model, undefined, doFetch);
  }
};

export const suggestFor = (p: ProviderId, models: ModelInfo[]): string | undefined =>
  ({ gemini: GeminiProvider.suggest, openai: OpenAiProvider.suggest, anthropic: AnthropicProvider.suggest, xai: XaiProvider.suggest })[p](models);

const KEY_RE = /^[A-Za-z0-9_\-.~+/=]{12,512}$/;
const MODEL_RE = /^(?!.*\.\.)[A-Za-z0-9_.\-:]{1,100}$/; // no '/' or '..': the model id is placed in a URL path by some adapters

export type HeaderResult = { ok: true; config?: ProviderConfig } | { ok: false; code: 'invalid_ai_config' };

/**
 * Reads the user's own provider settings from request headers. Headers (not the URL or body) keep keys out of access
 * logs and cached requests. Values are strictly validated so nothing can inject into a downstream header or URL.
 */
export function readProviderHeaders(h: Record<string, string | string[] | undefined>, needModel = true): HeaderResult {
  const one = (k: string) => (Array.isArray(h[k]) ? h[k]![0] : (h[k] as string | undefined));
  const provider = one('x-ai-provider');
  const key = one('x-ai-key');
  const model = one('x-ai-model');
  if (!provider && !key && !model) return { ok: true };
  if (!isProviderId(provider) || !key || !KEY_RE.test(key)) return { ok: false, code: 'invalid_ai_config' };
  if (needModel && (!model || !MODEL_RE.test(model))) return { ok: false, code: 'invalid_ai_config' };
  return { ok: true, config: { provider, apiKey: key, model: model && MODEL_RE.test(model) ? model : '' } };
}

