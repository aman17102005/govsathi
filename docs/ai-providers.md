# AI providers (bring your own key)

**GovSathi ships no AI key and needs none.** Search, eligibility, scheme details, documents, saving and comparison all work
without AI. A citizen who wants AI-written explanations may connect their **own** account with a provider on the AI settings
page (`/ai`). The key is their credential and the provider may charge them; the page says so in the citizen's language.

## Supported providers
| Provider | Adapter | Endpoint (from the provider's official docs, read 2026-10-03) | Structured output | Models list | Live-tested |
|---|---|---|---|---|---|
| Google Gemini | `apps/api/src/ai/gemini.ts` | `generativelanguage.googleapis.com/v1beta/models/{m}:generateContent`, `x-goog-api-key` | `responseSchema` | `GET /v1beta/models` | **Partly**: a deliberately invalid key was sent and correctly rejected (400 "API key not valid" -> auth error). No successful call. |
| OpenAI | `ai/openai.ts` | `POST api.openai.com/v1/responses`, Bearer | `text.format {type:"json_schema", strict}` | `GET /v1/models` | No |
| Anthropic Claude | `ai/anthropic.ts` | `POST api.anthropic.com/v1/messages`, `x-api-key` + `anthropic-version: 2023-06-01` | `output_config.format {type:"json_schema"}` | `GET /v1/models` | No |
| xAI Grok | `ai/xai.ts` | `POST api.x.ai/v1/chat/completions`, Bearer | `response_format {type:"json_schema"}` | undocumented: tried, falls back to a typed model name | No |

Not assumed to be identical: each adapter owns its endpoint, auth, schema dialect (`strictify` makes JSON Schema strict for
OpenAI/Anthropic/xAI), response envelope, refusal handling and error mapping. xAI's response envelope and model-list endpoint
were not shown in the docs excerpt read, so they are assumed OpenAI-compatible and flagged in the adapter. **Model names are never hard-coded**:
the model list comes from the provider with the citizen's key and a default is *suggested* from that list.

Capabilities are reported honestly in `ProviderCapabilities`: embeddings exist only in the Gemini adapter and are **not used**
(they would need a shared key); streaming is not implemented for any provider (answers are validated whole before display).

Adding a provider: write `ai/<name>.ts` implementing `AiProvider`, add it to `PROVIDER_IDS`, `PROVIDER_INFO` and `createProvider` in `ai/registry.ts`, add contract tests in `ai.test.ts`.

## How the key is handled
- Stored in the browser only: `sessionStorage` (cleared when the tab closes) unless the citizen ticks "remember on this device" (`localStorage`). Not encrypted: a browser cannot protect a secret from scripts on its own origin, so the app ships a strict CSP (`connect-src 'self'`), renders no untrusted HTML, and has no third-party scripts.
- Sent to GovSathi's server per request in the `x-ai-key` header (never URL/body), over HTTPS, only so the server can call the chosen provider. The server **does not store it**, keeps no per-user state, never logs it (errors are redacted with `redact()`), and marks `/api/*` responses `Cache-Control: no-store`. A proxy in front of the server must not log request headers.
- Validated strictly (provider allow-list, key charset/length, model charset without `/` or `..`) so nothing can inject into a downstream header or URL path.
- "Delete all my data" and "Remove key" erase it. The key-check endpoint has its own stricter rate limit.
- `GOVSATHI_VERIFY_KEY` / `--key-file` (outside the repo) are only for the local verification script; the script refuses key files inside the repository and writes no key anywhere.

## Failure behaviour
Invalid key, unknown model, quota (429), outage, malformed or refused output: each maps to a localized message with a link to the AI settings
(to pick another provider); results still come from the deterministic engine. No provider configured is not an error.

## Verification
`GOVSATHI_VERIFY_KEY=... npm run verify:ai -- <provider> [model]` runs a live end-to-end check (key + model list, structured output, grounded answers in English/Hindi/Punjabi/Tamil,
adversarial prompts, bad-key fallback) and writes `docs/verification/ai-live-<provider>.json`. Until a record with `"passed": true` exists for a provider,
that provider must be described as **implemented but not verified live**.
