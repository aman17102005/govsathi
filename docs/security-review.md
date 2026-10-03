# Security and privacy review (development self-review, 2026-10-03)

This is an engineering self-review with automated tests. It is **not** an independent security audit or a legal privacy review; both are still required before launch (see launch-checklist.md).

| Area | Risk | Control | Evidence |
|---|---|---|---|
| User API keys | Leak via URL, logs, errors, cache, analytics, repo | Header-only transport; no server storage; redaction in every error path; `no-store`; no analytics/third-party scripts; key files refused inside repo; `.gitignore` for `.env*`/`*.key`; no key setting exists on the server | `ai.test.ts`, `api.test.ts` ("never echoes or logs the key") |
| Key at rest in browser | XSS reads storage | sessionStorage default; strict CSP (`script-src 'self'`, `connect-src 'self'`); no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere in `apps/web/src` (grep-verified); React escapes all text | grep, CSP header |
| Header injection / path traversal via provider settings | Malicious `x-ai-*` values | Provider allow-list; key `[A-Za-z0-9_\-.~+/=]{12,512}`; model without `/` or `..` | `ai.test.ts` (7 rejection cases) |
| SSRF in source fetching | Fetch internal services via crafted URL/redirect/DNS | https-only; official-host allow-list; IP literals/credentials/ports refused; public-address check **at connect time**; redirects re-validated; size/time limits | `ingest.test.ts` (SSRF guard, redirects, robots) |
| Arbitrary URL fetching | Server as open proxy | The server fetches no user-supplied URLs at all; the fetcher runs only offline (CLI/CI) against `data/sources` and scheme records | design; `/api` has no URL parameters |
| Malicious scheme-source content / prompt injection | Page text steering the LLM | Fetched pages are hashed and keyword-matched only, never sent to an LLM; the LLM receives curated structured fields only; system prompt marks all input as data; output validated (scheme ids, no URLs, numbers must appear in data, script check, no certainty claims) | `api.test.ts` (prompt-injection suite), `rag` validation tests |
| Unsafe rendered HTML | XSS from data | All scheme text is rendered from structured fields via localized templates; source titles are text nodes; links are built from `https` URLs validated by `isOfficialUrl` | code review |
| API abuse | Cost/DoS | Per-IP rate limits (search 20/min, key-check 6/min), 16 KB body limit, bounded query length, strict fact validation | `api.test.ts` |
| Sensitive input | Citizens typing Aadhaar/bank/OTP | Rejected client- and server-side | `api.test.ts` |
| Data retention | Server holding personal data | No profile or key storage; 10-minute in-memory answer cache keyed by request (no user id, no key) | design |
| Local storage | Profile on shared devices | Profile local only; "delete all my data" also clears the AI key; document checklists local | UI |
| TLS | Weak transport to sources | Legacy renegotiation not enabled (excludes www.punjab.gov.in) | fetcher |
| Supply chain | Malicious dependency | Lockfile committed; few runtime deps; no install scripts approved | `package-lock.json` |

Known gaps: no independent penetration test; in-memory rate limiting is per-process (fine for one instance, not for scaling out); no CSRF concern (no cookies/sessions) but also no auth; the answer cache is shared across users by design; `npm audit` currently reports 1 low-severity advisory in esbuild (a build-time dev dependency); not part of CI yet; privacy policy text for citizens is not written or legally reviewed; DPDP Act obligations not assessed.
