import { describe, expect, it } from 'vitest';
import { LlmAuthError, LlmConfigError, LlmQuotaError, LlmUnavailableError, LlmUnsupportedError, redact, strictify, type FetchLike } from './llm';
import { GeminiProvider } from './ai/gemini';
import { OpenAiProvider } from './ai/openai';
import { AnthropicProvider } from './ai/anthropic';
import { XaiProvider } from './ai/xai';
import { PROVIDER_IDS, createProvider, readProviderHeaders } from './ai/registry';

const KEY = 'sk-test-SECRET-1234567890';
interface Seen { url: string; method: string; headers: Record<string, string>; body?: unknown }
function fake(status: number, body: unknown, badJson = false): { f: FetchLike; seen: Seen[] } {
  const seen: Seen[] = [];
  return {
    seen,
    f: async (url, init) => {
      seen.push({ url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
      return { status, ok: status >= 200 && status < 300, json: async () => { if (badJson) throw new Error('x'); return body; } };
    },
  };
}
const req = { system: 's', user: 'u', schema: { type: 'object', properties: { a: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] } } }, required: ['a', 'items'] } };

describe('request contracts (fake transport; matches the documented formats, not the live APIs)', () => {
  it('Gemini: key in x-goog-api-key header only, responseSchema, text from candidates', async () => {
    const { f, seen } = fake(200, { candidates: [{ content: { parts: [{ text: '{"a":"x","items":[]}' }] } }] });
    expect(await new GeminiProvider(KEY, 'm1', undefined, 50, f).generateJson(req)).toEqual({ a: 'x', items: [] });
    expect(seen[0]!.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m1:generateContent');
    expect(seen[0]!.url).not.toContain(KEY);
    expect(seen[0]!.headers['x-goog-api-key']).toBe(KEY);
    expect((seen[0]!.body as { generationConfig: { responseMimeType: string } }).generationConfig.responseMimeType).toBe('application/json');
  });
  it('OpenAI: /v1/responses, Bearer, text.format json_schema strict, reads output_text', async () => {
    const { f, seen } = fake(200, { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"a":"x","items":[]}' }] }] });
    expect(await new OpenAiProvider(KEY, 'm1', 50, f).generateJson(req)).toEqual({ a: 'x', items: [] });
    expect(seen[0]!.url).toBe('https://api.openai.com/v1/responses');
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    const b = seen[0]!.body as { text: { format: { type: string; strict: boolean; schema: { additionalProperties: boolean; required: string[] } } }; model: string };
    expect(b.model).toBe('m1');
    expect(b.text.format).toMatchObject({ type: 'json_schema', strict: true });
    expect(b.text.format.schema.additionalProperties).toBe(false);
  });
  it('Anthropic: /v1/messages, x-api-key + anthropic-version, output_config json_schema, reads content text', async () => {
    const { f, seen } = fake(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"a":"x","items":[]}' }] });
    expect(await new AnthropicProvider(KEY, 'm1', 50, f).generateJson(req)).toEqual({ a: 'x', items: [] });
    expect(seen[0]!.url).toBe('https://api.anthropic.com/v1/messages');
    expect(seen[0]!.headers['x-api-key']).toBe(KEY);
    expect(seen[0]!.headers['anthropic-version']).toBe('2023-06-01');
    const b = seen[0]!.body as { max_tokens: number; system: string; output_config: { format: { type: string } } };
    expect(b.output_config.format.type).toBe('json_schema');
    expect(b.system).toBe('s');
    expect(b.max_tokens).toBeGreaterThan(0);
  });
  it('xAI: chat/completions on api.x.ai, Bearer, response_format json_schema, reads choices[0].message.content', async () => {
    const { f, seen } = fake(200, { choices: [{ message: { content: '{"a":"x","items":[]}' } }] });
    expect(await new XaiProvider(KEY, 'm1', 50, f).generateJson(req)).toEqual({ a: 'x', items: [] });
    expect(seen[0]!.url).toBe('https://api.x.ai/v1/chat/completions');
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    expect((seen[0]!.body as { response_format: { type: string } }).response_format.type).toBe('json_schema');
  });
  it('strict schema: every property required and no extra properties, recursively', () => {
    const s = strictify(req.schema) as { additionalProperties: boolean; required: string[]; properties: { items: { items: { additionalProperties: boolean; required: string[] } } } };
    expect(s.additionalProperties).toBe(false);
    expect(s.required).toEqual(['a', 'items']);
    expect(s.properties.items.items.additionalProperties).toBe(false);
  });
});

describe.each([
  ['gemini', (f: FetchLike) => new GeminiProvider(KEY, 'm', undefined, 50, f)],
  ['openai', (f: FetchLike) => new OpenAiProvider(KEY, 'm', 50, f)],
  ['anthropic', (f: FetchLike) => new AnthropicProvider(KEY, 'm', 50, f)],
  ['xai', (f: FetchLike) => new XaiProvider(KEY, 'm', 50, f)],
] as const)('%s adapter failure handling', (_name, make) => {
  it('429 -> quota', async () => expect(make(fake(429, {}).f).generateJson(req)).rejects.toBeInstanceOf(LlmQuotaError));
  it.each([401, 403])('%i -> auth error', async (s) => expect(make(fake(s, {}).f).generateJson(req)).rejects.toBeInstanceOf(LlmAuthError));
  it('400 "API key not valid" -> auth error (Gemini reports bad keys as 400)', async () => {
    await expect(make(fake(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }).f).generateJson(req)).rejects.toBeInstanceOf(LlmAuthError);
  });
  it('400/404 otherwise -> config (model) error', async () => {
    await expect(make(fake(404, { error: { message: 'model not found' } }).f).generateJson(req)).rejects.toBeInstanceOf(LlmConfigError);
  });
  it('5xx, network failure, non-JSON and empty answers -> unavailable', async () => {
    await expect(make(fake(503, {}).f).generateJson(req)).rejects.toBeInstanceOf(LlmUnavailableError);
    await expect(make(async () => { throw new Error('down'); }).generateJson(req)).rejects.toBeInstanceOf(LlmUnavailableError);
    await expect(make(fake(200, {}, true).f).generateJson(req)).rejects.toBeInstanceOf(LlmUnavailableError);
    await expect(make(fake(200, {}).f).generateJson(req)).rejects.toBeInstanceOf(LlmUnavailableError);
  });
  it('never puts the key in an error message, even if the transport echoes it', async () => {
    const f: FetchLike = async () => { throw new Error(`connect failed for ${KEY}`); };
    try { await make(f).generateJson(req); expect.unreachable(); } catch (e) { expect((e as Error).message).not.toContain(KEY); }
  });
});

describe('model listing', () => {
  it('Gemini keeps only generateContent models and strips the "models/" prefix', async () => {
    const { f } = fake(200, { models: [{ name: 'models/a', supportedGenerationMethods: ['generateContent'] }, { name: 'models/e', supportedGenerationMethods: ['embedContent'] }] });
    expect((await new GeminiProvider(KEY, 'm', undefined, 50, f).listModels()).map((m) => m.id)).toEqual(['a']);
  });
  it('OpenAI drops non-chat models; Anthropic reads data[].id', async () => {
    expect((await new OpenAiProvider(KEY, 'm', 50, fake(200, { data: [{ id: 'x-mini' }, { id: 'text-embedding-9' }, { id: 'whisper-1' }] }).f).listModels()).map((m) => m.id)).toEqual(['x-mini']);
    expect((await new AnthropicProvider(KEY, 'm', 50, fake(200, { data: [{ id: 'c1', display_name: 'C 1' }] }).f).listModels())[0]).toEqual({ id: 'c1', label: 'C 1' });
  });
  it('xAI: an undocumented/unsupported listing endpoint becomes a typed "enter a model name" signal', async () => {
    await expect(new XaiProvider(KEY, 'm', 50, fake(404, {}).f).listModels()).rejects.toBeInstanceOf(LlmUnsupportedError);
    await expect(new XaiProvider(KEY, 'm', 50, fake(401, {}).f).listModels()).rejects.toBeInstanceOf(LlmAuthError);
  });
  it('suggestions come from the provider list, never from hard-coded names', () => {
    expect(GeminiProvider.suggest([{ id: 'zzz' }, { id: 'abc-flash-lite' }])).toBe('abc-flash-lite');
    expect(AnthropicProvider.suggest([{ id: 'one' }, { id: 'two-haiku' }])).toBe('two-haiku');
    expect(OpenAiProvider.suggest([{ id: 'first' }])).toBe('first');
    expect(XaiProvider.suggest([])).toBeUndefined();
  });
});

describe('user key handling', () => {
  const ok = { 'x-ai-provider': 'openai', 'x-ai-key': KEY, 'x-ai-model': 'some-model.1' };
  it('accepts well-formed settings and treats "none" as no AI', () => {
    expect(readProviderHeaders(ok)).toEqual({ ok: true, config: { provider: 'openai', apiKey: KEY, model: 'some-model.1' } });
    expect(readProviderHeaders({})).toEqual({ ok: true });
  });
  it.each([
    ['unknown provider', { ...ok, 'x-ai-provider': 'evil' }],
    ['key with whitespace/newline (header injection)', { ...ok, 'x-ai-key': 'abc def\r\nx-evil: 1 aaaaaaaa' }],
    ['too short key', { ...ok, 'x-ai-key': 'short' }],
    ['model with path traversal', { ...ok, 'x-ai-model': '../../admin' }],
    ['model with spaces', { ...ok, 'x-ai-model': 'a b' }],
    ['key without provider', { 'x-ai-key': KEY }],
    ['missing model', { 'x-ai-provider': 'openai', 'x-ai-key': KEY }],
  ])('rejects %s', (_n, h) => expect(readProviderHeaders(h)).toEqual({ ok: false, code: 'invalid_ai_config' }));
  it('the model is optional only for the model-listing call', () => {
    expect(readProviderHeaders({ 'x-ai-provider': 'gemini', 'x-ai-key': KEY }, false)).toMatchObject({ ok: true });
  });
  it('redact removes secrets', () => expect(redact(`bad ${KEY} here`, [KEY])).toBe('bad [redacted] here'));
  it('registry builds an adapter for every provider id', () => {
    for (const p of PROVIDER_IDS) expect(createProvider({ provider: p, apiKey: KEY, model: 'm' }).id).toBe(p);
  });
});
