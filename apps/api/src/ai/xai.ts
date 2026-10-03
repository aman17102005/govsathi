import { http, LlmUnavailableError, LlmUnsupportedError, LlmConfigError, strictify, suggestModel, type AiProvider, type FetchLike, type JsonRequest, type ModelInfo } from '../llm';

const BASE = 'https://api.x.ai/v1';

/**
 * xAI Grok. Documented (read 2026-10-03): base URL https://api.x.ai/v1, `Authorization: Bearer`, structured output via
 * `response_format {type:"json_schema", json_schema:{name, schema, strict}}` on the chat-completions interface.
 * Not documented there: the response envelope (assumed OpenAI-compatible: choices[0].message.content) and a model-list
 * endpoint (we try GET /v1/models and fall back to a typed model name). NOT yet exercised live.
 */
export class XaiProvider implements AiProvider {
  readonly id = 'xai';
  readonly name = 'xAI Grok';
  readonly capabilities = { structuredOutput: true, embeddings: false, streaming: false, listModels: true };
  static readonly preferred = [/fast/i, /mini/i];

  constructor(private readonly key: string, private readonly model: string, private readonly timeoutMs = 25000, private readonly doFetch: FetchLike = fetch as unknown as FetchLike) {}

  private get auth() {
    return { authorization: `Bearer ${this.key}` };
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const data = (await http(this.doFetch, 'POST', `${BASE}/chat/completions`, this.auth, {
      model: this.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'govsathi_response', strict: true, schema: strictify(req.schema) } },
    }, this.timeoutMs, [this.key])) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new LlmUnavailableError('empty model response');
    try {
      return JSON.parse(text);
    } catch {
      throw new LlmUnavailableError('model returned invalid JSON');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const data = (await http(this.doFetch, 'GET', `${BASE}/models`, this.auth, undefined, this.timeoutMs, [this.key])) as { data?: { id?: string }[] };
      return (data.data ?? []).filter((m): m is { id: string } => typeof m.id === 'string' && !/(image|video|imagine)/i.test(m.id)).map((m) => ({ id: m.id }));
    } catch (e) {
      if (e instanceof LlmConfigError) throw new LlmUnsupportedError('model listing is not available for this provider; enter a model name');
      throw e;
    }
  }

  static suggest(models: ModelInfo[]) {
    return suggestModel(models, XaiProvider.preferred);
  }
}
