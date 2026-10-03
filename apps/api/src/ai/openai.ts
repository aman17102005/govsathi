import { http, LlmUnavailableError, strictify, suggestModel, type AiProvider, type FetchLike, type JsonRequest, type ModelInfo } from '../llm';

const BASE = 'https://api.openai.com/v1';
const NOT_CHAT = /(embed|whisper|tts|dall-e|image|moderation|audio|realtime|transcribe|davinci|babbage|search|computer-use)/i;

/**
 * OpenAI Responses API. Contract from the official reference (read 2026-10-03): POST /v1/responses with Bearer auth,
 * `input` messages, structured output via `text.format {type:"json_schema", name, strict, schema}`, text at
 * output[].content[].text (type "output_text"). Models: GET /v1/models -> data[].id. NOT yet exercised live.
 */
export class OpenAiProvider implements AiProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities = { structuredOutput: true, embeddings: false, streaming: false, listModels: true };
  static readonly preferred = [/mini/i, /nano/i];

  constructor(private readonly key: string, private readonly model: string, private readonly timeoutMs = 25000, private readonly doFetch: FetchLike = fetch as unknown as FetchLike) {}

  private get auth() {
    return { authorization: `Bearer ${this.key}` };
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const data = (await http(this.doFetch, 'POST', `${BASE}/responses`, this.auth, {
      model: this.model,
      input: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      text: { format: { type: 'json_schema', name: 'govsathi_response', strict: true, schema: strictify(req.schema) } },
      max_output_tokens: req.maxOutputTokens ?? 1200,
    }, this.timeoutMs, [this.key])) as { status?: string; output?: { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[] };
    if (data.status && data.status !== 'completed') throw new LlmUnavailableError(`response ${data.status}`);
    const text = data.output?.flatMap((o) => o.content ?? []).find((c) => c.type === 'output_text')?.text;
    if (!text) throw new LlmUnavailableError('empty or refused model response');
    try {
      return JSON.parse(text);
    } catch {
      throw new LlmUnavailableError('model returned invalid JSON');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const data = (await http(this.doFetch, 'GET', `${BASE}/models`, this.auth, undefined, this.timeoutMs, [this.key])) as { data?: { id?: string }[] };
    return (data.data ?? []).filter((m): m is { id: string } => typeof m.id === 'string' && !NOT_CHAT.test(m.id)).map((m) => ({ id: m.id })).sort((a, b) => a.id.localeCompare(b.id));
  }

  static suggest(models: ModelInfo[]) {
    return suggestModel(models, OpenAiProvider.preferred);
  }
}
