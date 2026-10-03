import { http, LlmUnavailableError, strictify, suggestModel, type AiProvider, type FetchLike, type JsonRequest, type ModelInfo } from '../llm';

const BASE = 'https://api.anthropic.com/v1';

/**
 * Anthropic Messages API. Contract from the official reference (read 2026-10-03): POST /v1/messages with headers
 * `x-api-key` and `anthropic-version: 2023-06-01`; body {model, max_tokens, system, messages}; structured output via
 * `output_config.format {type:"json_schema", schema}`; text in content[].text. Models: GET /v1/models -> data[].id.
 * NOT yet exercised live.
 */
export class AnthropicProvider implements AiProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly capabilities = { structuredOutput: true, embeddings: false, streaming: false, listModels: true };
  static readonly preferred = [/haiku/i, /sonnet/i];

  constructor(private readonly key: string, private readonly model: string, private readonly timeoutMs = 25000, private readonly doFetch: FetchLike = fetch as unknown as FetchLike) {}

  private get headers() {
    return { 'x-api-key': this.key, 'anthropic-version': '2023-06-01' };
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const data = (await http(this.doFetch, 'POST', `${BASE}/messages`, this.headers, {
      model: this.model,
      max_tokens: req.maxOutputTokens ?? 1200,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      output_config: { format: { type: 'json_schema', schema: strictify(req.schema) } },
    }, this.timeoutMs, [this.key])) as { stop_reason?: string; content?: { type?: string; text?: string }[] };
    if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') throw new LlmUnavailableError(`stopped: ${data.stop_reason}`);
    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new LlmUnavailableError('empty model response');
    try {
      return JSON.parse(text);
    } catch {
      throw new LlmUnavailableError('model returned invalid JSON');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const data = (await http(this.doFetch, 'GET', `${BASE}/models?limit=100`, this.headers, undefined, this.timeoutMs, [this.key])) as { data?: { id?: string; display_name?: string }[] };
    return (data.data ?? []).filter((m): m is { id: string; display_name?: string } => typeof m.id === 'string').map((m) => ({ id: m.id, label: m.display_name }));
  }

  static suggest(models: ModelInfo[]) {
    return suggestModel(models, AnthropicProvider.preferred);
  }
}
