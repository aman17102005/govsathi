# Scheme data policy

- Every scheme record (`data/schemes/**`) cites at least one source (title, https URL, publisher, date read) and has a
  `lastVerified` date. `npm run schemes:lint` enforces this.
- Sources: the implementing ministry/department portals and PIB/Cabinet decisions first; myScheme (MeitY/NeGD) as an aggregator that can lag. See docs/scheme-lifecycle.md for the priority rule, claim-level citations, the publication gate and the update pipeline.
- Where sources disagree the newer/authoritative one is used and the conflict is recorded (`discrepancies`). Resolved 2026-10-03: PM SVANidhi first tranche is up to INR 15,000 per the PIB Cabinet release (myScheme's 10,000 is the pre-restructuring figure). PMUY: the ministry's own pages disagree (2,050 vs 1,600), so the amount is withheld.
- Records carry `dataVersion` and `updatedOn`; claims may carry `src` (index into `sources`) and the UI then shows
  "Official source: <domain>" under that section. Disagreements between sources are never merged silently: they are recorded
  in `discrepancies` (all values, which is used, why, `open`/`resolved`) and the detail page warns that official figures
  differ. `npm run schemes:report` lists them. Open now: PM SVANidhi (ministry figure kept pending a manual re-read);
  PMUY resolved in favour of the ministry per project policy.
- Only facts stated by a source are encoded. Amounts that vary by region are omitted. Conditions we cannot model
  set `additionalConditions: true`; the UI then never says "Potentially eligible", only "Potential match".
- Scheme content is localized through structured fields (rules, benefits, documents, steps, channels, departments) rendered
  from reviewed templates. Free-text translation of official content is deliberately avoided. Official scheme names stay in
  their published form (marked `lang="en"`); source citations are shown by web domain.
- Coverage: 16 central, 9 Punjab, 6 Rajasthan records; the public catalogue is whichever pass the gate on the day (25 on 2026-10-03). Audit findings 2026-10-03: Punjab health cover rewritten (now INR 10 lakh, all residents), Ashirwad channel changed to Sewa Kendra only, PMEGP / PMKVY / PMAY-U / PMAY-G placed on hold. State datasets are plain folders: add `data/schemes/<state-code>/`.
- Re-verify before launch: schemes change and close. `lastVerified` is shown to citizens.
- Districts: not collected. No verified, localized district dataset was available (LGD is the authority) and no scheme
  in the current dataset uses district.

## Districts (future)
`DistrictRecord` / `DistrictDataset` in `packages/shared/src/geo.ts` define the contract for `data/districts/<state>.json`
(LGD codes, official names, reviewed local names, source, last verified). No dataset exists and none may be invented. Until
one is added and verified, no district is collected and no district-specific eligibility is claimed.
