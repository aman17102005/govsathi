# Scheme validity, lifecycle and automated updates

Principle: **correct + verified + current + traceable** over more schemes.

## Lifecycle
`discovered -> pending-verification -> verified -> published -> updated`, and `suspended`, `discontinued`, `archived`.
Only `published`/`updated` records can be recommended. `suspended`/`discontinued` records remain openable (so a saved link can say the scheme ended)
but are never recommended. Everything else is invisible to citizens. Each record has `history[]` (version, date, lifecycle, change, who/what, source URL) and
`verification {level: unverified|automated|human, by, on, method}`. **Who verified is recorded; nothing is labelled human-verified unless a person did it** (currently: none).

## The publication gate (`publicationBlockers`, packages/shared/src/catalogue.ts)
A scheme is recommendable only if ALL hold: lifecycle published/updated; no maintainer `hold`; at least one official source (https, `gov.in`/`nic.in`);
verification level not `unverified`; no open discrepancy; every benefit and every hard eligibility rule and the apply link has a claim-level citation to an official source
(benefit/rule citations must be `text-match`, i.e. found in fetched official text; only the apply link may be `declared`); and, evaluated against **today's date**, the scheme period/deadline has not
passed and the record was verified within 90 days. The date is always an input (`currentState(scheme, today)`), on the server per request and in the browser, so an old dataset cannot stay "active" forever.
UI states: Active, Deadline approaching (within 30 days), Expired, Suspended, Discontinued, Verification required.

## Source priority and conflicts
1. The implementing ministry/department's own current page or notification; 2. PIB / Cabinet decisions for amounts and periods (newer wins over older aggregator text);
3. myScheme (MeitY/NeGD) as an aggregator, which can lag (it showed PM SVANidhi at INR 10,000, PMAY-G "till March 2024", and a pre-2026 Punjab health cover). Blogs, news, social and third-party sites are never sources.
Disagreements are recorded in `discrepancies[]` (all values, which is used and why, open/resolved) and never merged silently. When an authority's own pages disagree (PMUY: 2,050 vs 1,600) the figure is **withheld** and the citizen is pointed to the official source.

## Claim-level citations
`citations[]` links a claim (`benefit:<i>`, `rule:<id>`, `document:<id>`, `apply.url`, ...) to a source index with the supporting sentence (`quote`), how it was established (`text-match` / `manual` / `declared`) and the date read.
`npm run ingest -- cite` rebuilds them by matching each claim's numbers/keywords against the stored official text. This proves "the official page says this", not that GovSathi understood it; a reviewer can check the quote in seconds. Amounts that appear only as an OLD figure ("from the earlier INR 5 lakh") do not count (this caught a stale Punjab health-cover record).

## Automated discovery / update pipeline (`packages/ingest`, `tools/ingest`)
```
official sources -> safe fetch -> extract text -> fingerprint -> change detection -> demote on material change -> (human or gate) -> publish
                       |  SSRF guard, robots.txt, rate limit, retries, ETag, size/time limits
```
- **Fetcher**: https only; hosts must be `gov.in`/`nic.in`; IP literals, credentials and odd ports refused; DNS answers must be public addresses *at connect time*; every redirect hop re-validated; robots.txt honoured (unreachable robots.txt = deny); 2.5 s per-host spacing; retry with backoff on 429/5xx; 3 MB cap; text content types only. The bot identifies itself and never spoofs a browser.
- **Change detection**: `textHash` (any change) vs `claimHash` (sentences carrying amounts/ages/eligibility words, minus dashboard counters). A material change **demotes** the scheme to `pending-verification` automatically (it leaves the catalogue); a 404/410 demotes and flags for a person (never auto-discontinues). Transient errors change nothing. Promotion never happens automatically except through the gate (`ingest promote`).
- **Discovery**: sitemap/listing sources in `data/sources/registry.json` produce *candidates* (`discovered`, URL + title only, never shown). Candidates carry no facts: a record must be authored, cited and gated.
- **Audit**: `data/ingest/audit.jsonl` (append-only), `snapshots/`, `source-health.json`, `candidates.json`.
- **Schedule**: `.github/workflows/ingest.yml` runs `npm run ingest -- run` weekly and opens a pull request with any changes (so a person sees demotions and candidates). Not a second Render service.
- **Untrusted input**: fetched pages are only hashed and keyword-matched; they are never sent to an LLM, so embedded instructions cannot steer anything. The LLM sees only curated structured fields (tested).

## What this cannot do (stated plainly)
- There is **no national machine-readable scheme feed**. myScheme has no documented public API (its site's backend key is embedded in its JavaScript; using it would be using a credential not issued to this project, so it is not used). Pages are client-rendered, so myScheme text is imported through a rendering browser (`ingest import`) with provenance, not crawled.
- Many official sites return HTTP 403 or disallow bots in robots.txt (PIB, MoHUA, MSDE, PM-KISAN, Jan Suraksha, Punjab SSWCD, Rajasthan SSO...). Those sources cannot be auto-monitored and show as failing in `source-health`; they are refreshed by assisted import or a person.
- `www.punjab.gov.in` needs unsafe legacy TLS renegotiation, which is deliberately not enabled.
- Detection of *new* schemes is limited to the registered sitemaps/listings; **no guarantee that every new scheme is found.**
- Keyword evidence is not comprehension; the 90-day staleness rule and the human review step exist because of that.
