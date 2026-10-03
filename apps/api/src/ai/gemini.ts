import { http, LlmUnavailableError, suggestModel, type AiProvider, type EmbeddingProvider, type FetchLike, type JsonRequest, type ModelInfo } from '../llm';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Google Gemini (generateContent, x-goog-api-key). Docs read 2026-10-03; NOT yet exercised against the live API. */
export class GeminiProvider implements AiProvider, EmbeddingProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities = { structuredOutput: true, embeddings: true, streaming: false, listModels: true };
  static readonly preferred = [/flash-lite/i, /flash/i];

  constructor(
    private readonly key: string,
    private readonly model: string,
    private readonly embeddingModel = 'gemini-embedding-001',
    private readonly timeoutMs = 20000,
    private readonly doFetch: FetchLike = fetch as unknown as FetchLike,
  ) {}

  private post(url: string, body: unknown) {
    return http(this.doFetch, 'POST', url, { 'x-goog-api-key': this.key }, body, this.timeoutMs, [this.key]);
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const data = (await this.post(`${BASE}/models/${this.model}:generateContent`, {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: req.schema, temperature: 0.2, maxOutputTokens: req.maxOutputTokens ?? 1200 },
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new LlmUnavailableError('empty model response');
    try {
      return JSON.parse(text);
    } catch {
      throw new LlmUnavailableError('model returned invalid JSON');
    }
  }

  async embed(texts: string[], task: 'document' | 'query'): Promise<number[][]> {
    const taskType = task === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
    const data = (await this.post(`${BASE}/models/${this.embeddingModel}:batchEmbedContents`, {
      requests: texts.map((text) => ({ model: `models/${this.embeddingModel}`, content: { parts: [{ text }] }, taskType })),
    })) as { embeddings?: { values: number[] }[] };
    if (!data.embeddings || data.embeddings.length !== texts.length) throw new LlmUnavailableError('bad embedding response');
    return data.embeddings.map((e) => e.values);
  }

  async listModels(): Promise<ModelInfo[]> {
    const data = (await http(this.doFetch, 'GET', `${BASE}/models?pageSize=200`, { 'x-goog-api-key': this.key }, undefined, this.timeoutMs, [this.key])) as {
      models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[];
    };
    return (data.models ?? [])
      .filter((m) => m.name && (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => ({ id: m.name!.replace(/^models\//, ''), label: m.displayName }));
  }

  static suggest(models: ModelInfo[]) {
    return suggestModel(models, GeminiProvider.preferred);
  }
}
