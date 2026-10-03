# Language readiness

All 24 locales (22 scheduled languages + Rajasthani + English) exist in the architecture. **Only English is reviewed.**
Every other locale is an unreviewed development draft; none may be described as fully supported or as an "official
translation". Status lives in `locales/<code>/meta.json` and is never shown to citizens.

Check the current state any time: `npm run i18n:readiness`.

## Statuses
| Status | Meaning | Allowed when |
|---|---|---|
| `reviewed` | A human reviewer signed off UI, scheme vocabulary and safety strings | `review` record present with reviewer, method, date, all three scopes; translator is not `draft:*` |
| `partially-reviewed` | Review covered only some scopes | `review` record present |
| `machine-translated` | Produced by a model/MT, no human review | no `review` record |
| `needs-review` | Low-confidence draft | no `review` record |

`npm run i18n:check` rejects `reviewed` / `partially-reviewed` without a real review record, and rejects a review
record on unreviewed statuses. Never write a review record that did not happen.

## Public-build gating
A production build offers **only `reviewed` locales** in the language picker. Unreviewed locales appear in development,
or in an internal preview built with `npm run build:preview` (sets `VITE_ENABLE_UNREVIEWED_LOCALES=1`) for native-review
sessions. Do not deploy a preview build publicly.

## Review priority (lowest confidence first)
- **critical**: Bodo (brx), Santali (sat), Manipuri (mni), Kashmiri (ks)
- **high**: Dogri (doi), Konkani (kok), Maithili (mai), Rajasthani (raj, limited resources), Sanskrit (sa), Sindhi (sd)
- **normal**: the remaining 13 languages (as, bn, gu, hi, kn, ml, mr, ne, or, pa, ta, te, ur)

## Checklist to move one locale to `reviewed`
1. Export the locale (`locales/<code>/*.json`) and `locales/en` side by side for the reviewer.
2. Reviewer checks: UI wording, scheme vocabulary (benefits, rules, documents, steps, departments), safety strings
   (disclaimers, "potential match" wording, error messages), script/diacritics, gender and honorific neutrality,
   respectful terms for marital status and disability, numerals, and date/month names.
3. Apply corrections; keep `{placeholders}` intact; run `npm run i18n:check`.
4. Add to `meta.json`: `translator: "human:<name or org>"`, `status`, `updatedOn`, and
   `review: { reviewer, method, reviewedOn, scope: ["ui","scheme-vocabulary","safety-strings"], reference }`.
5. Re-run checks and tests; the locale then appears in production builds automatically.

## Rajasthani (raj)
Uses standardized Devanagari and is marked `limitedResource`. No verified corpus or MT resource with a clear licence has
been identified, so the text is a draft. A verified resource can be plugged in by replacing the locale files and adding a
review record; do not advertise full support before the same review and licence checks as other languages.
