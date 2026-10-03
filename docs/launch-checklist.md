# Public launch checklist

**Status: NOT launch-ready.** Run `npm run readiness` for the live view (exit code 1 until every item has a record).
An item is done only when `docs/verification/<item>.json` says `"passed": true`, written after the work really happened. Partial records (what was done, what is open) are kept so nothing is hidden.

| # | Item | Done? | How it is satisfied |
|---|---|---|---|
| 1 | AI provider live verification | No | A person supplies their own key locally: `GOVSATHI_VERIFY_KEY=... npm run verify:ai -- <gemini\|openai\|anthropic\|xai>` writes `docs/verification/ai-live-<provider>.json`. Providers without a passing record must be described as "implemented, not verified live". |
| 2 | Scheme data re-verification + source verification | No | 25 records pass the automated gate (official-text evidence, 90-day currentness); 0 are human-verified; 6 are withheld. A person must open each source and set `verification.level: human`. `npm run schemes:report`, `npm run ingest -- status` |
| 3 | Multilingual translation review | No | docs/language-readiness.md (23 locales unreviewed) |
| 4 | Rajasthani resource/licence review | No | see language-readiness.md |
| 5 | Security review | No (partial) | docs/security-review.md; independent review still needed |
| 6 | Privacy review | No (partial) | docs/privacy-and-trust.md; citizen policy text + legal/DPDP review needed |
| 7 | Accessibility testing | No (partial) | axe audit clean on key pages; screen-reader testing still needed |
| 8 | Responsive testing | No (partial) | 375 px checked; real-device matrix needed |
| 9 | AI hallucination testing | No (partial) | fake-provider + injection tests pass; live adversarial run needs item 1 |
| 10 | Fallback testing | No (partial) | all failure modes unit-tested; live quota untested |
| 11 | Localization completeness testing | No (partial) | automated checks pass; semantic review depends on item 3 |
| 12 | Human review of auto-verified schemes | No | see item 2 |
