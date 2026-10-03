# GovSathi

AI-assisted discovery of Indian government schemes: tell it who you are and what you need; it finds schemes that *may*
be relevant, explains why, and links to the official source. It never confirms eligibility and never submits applications.

- 24 UI languages: the 22 scheduled languages + Rajasthani (additional, standardized Devanagari) + English.
- Central schemes plus Punjab and Rajasthan state schemes (31 records of which only those passing the publication gate are shown; see `docs/scheme-lifecycle.md`).
- Privacy-first: the profile lives on the device. Only the question and a few derived facts are sent to the server.

## Architecture

```
apps/web        React + TypeScript + Vite + Tailwind (PWA-ready SPA)
apps/api        Node + Express: /api/search, serves the built web app. One process, one container.
packages/shared      types, language registry, facts derivation, localized-text builders
packages/eligibility deterministic rule engine (no LLM)
packages/retrieval   n-gram BM25 + concept lexicon + shared ranking (runs on server AND offline in the browser)
data/schemes         verified scheme records (JSON) with sources and verification dates
locales/<code>       app.json, vocab.json, geo.json, common.json + meta.json (internal quality status)
tools/               i18n-check, scheme-lint
```

Search pipeline: query understanding (lexicon; the user's own LLM only when the lexicon finds nothing) -> lexical/concept retrieval over the
**public catalogue** -> deterministic eligibility filtering and ranking -> optional grounded explanation by the citizen's **own** AI provider (validated:
no invented schemes, URLs, amounts; must be in the target script) -> UI. With no AI key the app answers from stored scheme data. If the server is
unreachable, the browser searches locally. See `docs/ai-providers.md` and `docs/scheme-lifecycle.md`.

## Run

```bash
npm install
npm run build          # runs i18n:check + schemes:lint + builds web and api
PORT=3000 npm start    # http://localhost:3000
```

Development: `npm run dev:api` (port 3000) and `npm run dev:web` (port 5173, proxies /api).

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | 3000 |
| `SEARCH_PER_MINUTE` | Rate limit per client for search | 20 |
| `AI_CHECK_PER_MINUTE` | Rate limit per client for the key-check endpoint | 6 |
| `VITE_ENABLE_UNREVIEWED_LOCALES=1` (build time) | Offer unreviewed locales in a production build (internal preview only) | off |

There is **no AI key variable**: GovSathi has no shared key. Citizens bring their own (`/ai` page). Do not set or commit any provider key.

## Quality gates

`npm test` (unit/API tests), `npm run schemes:report`, `npm run ingest -- status`, `npm run readiness`, `npm run i18n:check` (every key in every locale, no English fallback, no stray Latin text,
right script, placeholders intact), `npm run schemes:lint` (sources, dates, vocabulary, every sentence a scheme needs
exists in the reference locale, every criterion is something the assistant can ask).

## Deploy (Render)

`render.yaml` defines one web service (build `npm ci && npm run build`, start `npm start`, health `/api/health`).
No secrets are required. Scheduled source monitoring runs in GitHub Actions (`.github/workflows/ingest.yml`), not as a second service.

## Docs

`docs/scheme-lifecycle.md` · `docs/ai-providers.md` · `docs/launch-checklist.md` · `docs/language-readiness.md` · `docs/security-review.md` · `docs/decisions.md` (locked product decisions) · `docs/data-policy.md` · `docs/privacy-and-trust.md` ·
`docs/resources.md` (language resources, Rajasthani research, licenses) · `docs/voice-architecture.md`
