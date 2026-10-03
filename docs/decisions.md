# Locked decisions (2026-10-03)

- Pilot states (Phase 3): Punjab, Rajasthan. Data model must not be limited to these; any State/UT can be added as data.
- LLM: superseded 2026-10-03 - **no shared AI key**. Citizens may bring their own key for Gemini, OpenAI, Anthropic or xAI behind a provider abstraction (docs/ai-providers.md). Claude is a development tool only.
- Cost: prefer free/low-cost tiers; deterministic logic for structured tasks (eligibility); LLM only for NL understanding and grounded response generation.
- Locale review: no native reviewers for all languages assumed. Never fall back to English. Each locale carries internal quality metadata
  (`locales/<code>/meta.json`: reviewed | machine-translated | partially-reviewed | needs-review) which is never shown in the UI.
- Critical scheme information (eligibility, benefits, documents, application steps): controlled translation pipeline, source preserved.
- Rajasthani: additional language (not one of the 22 scheduled), standardized Devanagari representation for v1.
- Hosting: React/TS/Vite/Tailwind frontend + Node/Express/TS backend, deployed as ONE Render web service. No microservices.

# Current status (2026-10-03)

- Locales: 24 (22 scheduled + Rajasthani + English). All non-English text is an unreviewed draft written during development.
  13 are tagged `machine-translated`; 10 are tagged `needs-review` (brx doi ks kok mai mni raj sa sat sd) and are low-confidence.
  Status lives in `locales/<code>/meta.json` and is never shown to citizens. Production builds offer only `reviewed` locales; `VITE_ENABLE_UNREVIEWED_LOCALES=1` (`npm run build:preview`) is for internal review only. See language-readiness.md and launch-checklist.md.
- District selection is deferred (see data-policy). Voice is deferred (see voice-architecture).
- AI adapters (Gemini, OpenAI, Anthropic, xAI) are implemented against each provider's documented contract and tested with fake transports; **none has had a successful live call yet** (only a rejected-invalid-key round trip to Gemini). `npm run verify:ai` needs a key you supply locally.
- Scheme data: 25 records pass the automated publication gate (not human-verified); 6 are held/pending. See docs/scheme-lifecycle.md.
