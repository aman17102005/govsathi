# Privacy and trust design

**On the device only:** the full profile, saved schemes, comparison list, document checklists, language choice
(localStorage). "Delete all my data" clears them.

**Sent to the server for a search:** the typed question, the language, a list of declined fields, and *facts* (age in years,
state, area, category, income range, occupation, booleans such as "has a bank account"). Never the name, date of birth or
district. The server stores no profile and keeps no request log of personal content (in-memory caches expire).

**Sent to an LLM, only if the citizen connects their own provider key:** the question and the same facts, plus the candidate scheme records, go to the provider the citizen chose, using the citizen's own account. The citizen's key is stored only in their browser (session by default), sent in a header per request, never stored or logged by the server. The citizen is told the key is their own credential and may incur charges. Provider data-retention terms apply to the citizen's own account.

**Never requested:** passwords, Aadhaar numbers, bank account numbers. Queries that look like them are rejected (client
and server).

**Plausibility bounds** (documented inference, not guessing about choices): pregnancy/breastfeeding is treated as "no" for
men and outside ages 12-55; at 60+ with no education answer, the person is treated as not studying. Both can be overridden by the citizen.

**Anti-hallucination:** eligibility is deterministic. The LLM only writes explanations. Its output is accepted only if scheme IDs
are from the candidate list, it contains no URL/email, every number appears in the provided data, it is in the target script,
and it does not claim certainty. Otherwise the stored-data template is used.

**Abuse controls:** per-client rate limit (stricter on key checks), request size limits, strict header validation, `Cache-Control: no-store` on API responses, helmet security headers (CSP `connect-src 'self'`), no third-party scripts. **Retention:** the server keeps no profile, no keys and no request log of personal content; an in-memory answer cache (keyed by request, not by user or key) expires after 10 minutes.
