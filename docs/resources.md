# Language resources research (verified 2026-10-03)

Rule: use a resource only if its license is verified; never fabricate one. Findings below are what was actually checked.

## Rajasthani (additional language; not one of the 22 scheduled languages)

Rajasthani is a macro-label (ISO 639-3 `raj`) over varieties (Marwari, Mewari, Dhundhari, Harauti, Bagri, Wagdi, Malvi...).
**Scope decision (v1): one standardized Devanagari representation**, close to Marwari, documented here.

| Resource | What it is | License | Status |
|---|---|---|---|
| LDC-IL Gold Standard Rajasthani Raw Text Corpus (https://data.ldcil.org/a-gold-standard-rajasthani-raw-text-corpus) | ~1.2M words, monolingual, Unicode XML, several dialects | **Not verified** | Not used. Could seed a glossary/evaluation set once terms are confirmed. |
| Project Vaani (https://vaani.iisc.ac.in/) | Speech: ~187 h Rajasthani, ~158 h Marwari (as listed) | **Not verified** | Not used. Candidate for Rajasthani ASR (Phase 7). |
| Common Voice Scripted Speech 24.0 - Marwari | 10.65 h, 20 speakers | **Not verified** (Common Voice has historically been CC0) | Not used. |
| IndicTrans2 (AI4Bharat) | MT for the 22 scheduled languages | Model card says MIT, **but the model repo is gated** (needs a Hugging Face login and acceptance) | **Does not cover Rajasthani.** Not run here. |
| Bhashini | Government language platform | Terms not verified | Rajasthani/Marwari support **not confirmed** in the model lists consulted. |
| Parallel Rajasthani-Hindi/English corpus | - | - | **None found.** (CorIL does not include Rajasthani.) |

Consequence: there is no verified machine-translation system for Rajasthani. The shipped Rajasthani UI text is an
unreviewed draft (`locales/raj/meta.json`: `needs-review`) and must be reviewed by Rajasthani speakers before public
release. Capabilities with no reliable resource (MT, ASR, TTS) are not faked.

## Scheduled languages

All shipped locales are unreviewed drafts written during development (see `locales/<code>/meta.json`). Confidence is
lowest for Bodo, Santali, Manipuri (Meitei Mayek), Kashmiri, Dogri, Konkani, Maithili, Sanskrit, Sindhi, Rajasthani.
Production path: regenerate and verify through a controlled pipeline (IndicTrans2 where its terms are accepted by the
project owner, Bhashini, or Gemini with human spot-checks), then native-speaker review; flip `meta.json` status.
Production builds ship only locales marked `reviewed` (see language-readiness.md).

## Not adopted (and why)

- IndicNLP / ULCA / Bhashini speech: voice is deferred (see `voice-architecture.md`).
- Open multilingual embeddings (e.g. BGE-M3, multilingual-e5) were not benchmarked; retrieval uses n-gram BM25 and
  a concept lexicon (no embeddings: they would need a shared provider key).
