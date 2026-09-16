# GovSathi — Phase 1

AI-flavoured (but currently non-AI) multilingual government information
assistant. **Phase 1** is a frontend-only prototype: a single page where a
citizen describes their situation in plain language, and a local
keyword-matching engine surfaces the top 3 government schemes worth
checking, from a small curated dataset.

No login, no database, no backend, no paid APIs — everything runs in the
browser.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

To build a production bundle:

```bash
npm run build
npm run preview
```

## How matching works

1. `src/lib/search.ts` tokenises the user's question (lowercases it, strips
   punctuation, drops filler words, keeps numbers like ages/income figures).
2. Each scheme in `src/data/schemes.json` is scored by how many of those
   tokens appear in its `keywords`, `name`, `category`, `eligibility`, and
   `description` fields — `keywords` matches count the most, since that
   field is written specifically to describe who the scheme is for.
3. Schemes are sorted by score, and the top 3 with a non-zero score are
   shown as "Potential match" cards — never a guarantee of eligibility.

## Data

`src/data/schemes.json` currently holds 10 real, well-known central
government schemes spanning agriculture, health, housing, education,
women & child welfare, pensions, entrepreneurship, and financial
inclusion. Scheme details are summarised for readability; always confirm
current rules on the scheme's official portal before applying.

## Explicitly out of scope for Phase 1

Multilingual support, LLM/AI integration, voice input, login, a database,
a dashboard, and additional pages are intentionally not implemented yet.
