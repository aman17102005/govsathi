import fs from 'node:fs';
import path from 'node:path';
import { LOCALE_STATUSES, REVIEW_SCOPES, SCRIPT_RANGES, type Language } from '@govsathi/shared';

export interface Issue {
  locale: string;
  key?: string;
  kind:
    | 'missing-locale'
    | 'missing-key'
    | 'extra-key'
    | 'empty'
    | 'english-copy'
    | 'placeholder-mismatch'
    | 'stray-latin'
    | 'wrong-script'
    | 'bad-meta'
    | 'fabricated-review'
    | 'unknown-locale-dir'
    | 'bad-file';
  message: string;
}

export interface CheckOptions {
  localesDir: string;
  languages: readonly Language[];
  referenceCode?: string;
  /** Latin-script tokens that may legitimately appear in any locale. */
  latinAllowlist?: readonly string[];
  /** Keys whose value may be identical to the reference (e.g. brand name). */
  identicalAllowed?: readonly string[];
  /** Keys that are pure punctuation/placeholders and carry no script of their own (e.g. "{fact}: {value}"). */
  neutralKeys?: readonly string[];
  /** Locale files to check (one JSON file per namespace). */
  files?: readonly string[];
}

const placeholders = (s: string) => [...s.matchAll(/\{\s*(\w+)/g)].map((m) => m[1]!).sort();

function readJson(file: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const isStringMap = (v: unknown): v is Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'string');

export function checkLocales(opts: CheckOptions): Issue[] {
  const {
    localesDir,
    languages,
    referenceCode = 'en',
    latinAllowlist = ['GovSathi'],
    identicalAllowed = ['app.name', 'common.percent', 'rule.eq', 'rule.in'],
    neutralKeys = ['app.name', 'common.percent', 'rule.eq', 'rule.in'],
    files = ['common.json', 'app.json', 'vocab.json', 'geo.json'],
  } = opts;
  const issues: Issue[] = [];
  const known = new Set(languages.map((l) => l.code));

  if (fs.existsSync(localesDir)) {
    for (const d of fs.readdirSync(localesDir, { withFileTypes: true })) {
      if (d.isDirectory() && !known.has(d.name)) {
        issues.push({ locale: d.name, kind: 'unknown-locale-dir', message: 'Folder is not in the language registry.' });
      }
    }
  }

  const reference: Record<string, Record<string, string>> = {};
  for (const f of files) {
    const r = readJson(path.join(localesDir, referenceCode, f));
    if (!r.ok || !isStringMap(r.value)) {
      issues.push({ locale: referenceCode, kind: 'bad-file', message: `Reference ${f} unreadable or not a flat string map.` });
      return issues;
    }
    reference[f] = r.value;
  }

  for (const lang of languages) {
    const dir = path.join(localesDir, lang.code);
    if (!fs.existsSync(dir)) {
      issues.push({ locale: lang.code, kind: 'missing-locale', message: 'Locale folder does not exist.' });
      continue;
    }

    const meta = readJson(path.join(dir, 'meta.json'));
    const m = meta.ok ? (meta.value as Record<string, unknown>) : null;
    if (!m || !LOCALE_STATUSES.includes(m.status as never) || typeof m.translator !== 'string' || typeof m.updatedOn !== 'string') {
      issues.push({ locale: lang.code, kind: 'bad-meta', message: 'meta.json missing or invalid (status, translator, updatedOn).' });
    } else {
      const status = m.status as string;
      const review = m.review as Record<string, unknown> | undefined;
      const isDraft = /^(draft|machine)/i.test(String(m.translator));
      if (/official translation/i.test(String(m.notes ?? ''))) {
        if (!/do not (present|label) as an official translation/i.test(String(m.notes))) {
          issues.push({ locale: lang.code, kind: 'bad-meta', message: 'Locales must never be described as an "official translation".' });
        }
      }
      if (lang.code === referenceCode) {
        if (status !== 'reviewed') issues.push({ locale: lang.code, kind: 'bad-meta', message: 'Reference locale must be "reviewed".' });
      } else if (status === 'reviewed' || status === 'partially-reviewed') {
        const scope = Array.isArray(review?.scope) ? (review!.scope as string[]) : [];
        const ok = !!review && typeof review.reviewer === 'string' && review.reviewer.trim() !== '' &&
          ['native-speaker', 'professional-translator'].includes(String(review.method)) &&
          typeof review.reviewedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn);
        if (!ok) issues.push({ locale: lang.code, kind: 'fabricated-review', message: `Status "${status}" requires a real review record (reviewer, method, reviewedOn, scope).` });
        else if (status === 'reviewed' && !REVIEW_SCOPES.every((x) => scope.includes(x))) {
          issues.push({ locale: lang.code, kind: 'fabricated-review', message: `Status "reviewed" requires scope ${REVIEW_SCOPES.join(', ')}.` });
        }
        if (isDraft) issues.push({ locale: lang.code, kind: 'fabricated-review', message: 'Translator is still a draft/machine source; update it to the reviewed text author or reviewer.' });
      } else if (review) {
        issues.push({ locale: lang.code, kind: 'fabricated-review', message: `A review record is not allowed on status "${status}".` });
      }
    }

    for (const f of files) {
      const r = readJson(path.join(dir, f));
      if (!r.ok || !isStringMap(r.value)) {
        issues.push({ locale: lang.code, kind: 'bad-file', message: `${f} unreadable or not a flat string map.` });
        continue;
      }
      const msgs = r.value;
      const ref = reference[f]!;
      for (const key of Object.keys(ref)) {
        if (!(key in msgs)) issues.push({ locale: lang.code, key, kind: 'missing-key', message: 'Translation missing.' });
      }
      for (const key of Object.keys(msgs)) {
        if (!(key in ref)) issues.push({ locale: lang.code, key, kind: 'extra-key', message: 'Key not in reference locale.' });
      }
      if (lang.code === referenceCode) continue;

      for (const [key, value] of Object.entries(msgs)) {
        const refValue = ref[key];
        if (refValue === undefined) continue;
        if (value.trim() === '') {
          issues.push({ locale: lang.code, key, kind: 'empty', message: 'Empty translation.' });
          continue;
        }
        if (value === refValue && !identicalAllowed.includes(key)) {
          issues.push({ locale: lang.code, key, kind: 'english-copy', message: 'Identical to reference text (untranslated).' });
        }
        if (placeholders(value).join() !== placeholders(refValue).join()) {
          issues.push({ locale: lang.code, key, kind: 'placeholder-mismatch', message: 'Placeholders differ from reference.' });
        }
        if (neutralKeys.includes(key)) continue;
        // Strip placeholders/ICU syntax and allowlisted tokens, then no Latin letters may remain.
        let stripped = value.replace(/\{[^}]*\}/g, '');
        for (const tok of latinAllowlist) stripped = stripped.split(tok).join('');
        if (/[A-Za-z]/.test(stripped)) {
          issues.push({ locale: lang.code, key, kind: 'stray-latin', message: `Latin-script text found: "${stripped.match(/[A-Za-z][\w' -]*/)?.[0]}"` });
        }
        if (!SCRIPT_RANGES[lang.script].test(value)) {
          issues.push({ locale: lang.code, key, kind: 'wrong-script', message: `No ${lang.script} characters found.` });
        }
      }
    }
  }
  return issues;
}

export function readStatuses(localesDir: string, languages: readonly Language[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of languages) {
    const r = readJson(path.join(localesDir, l.code, 'meta.json'));
    out[l.code] = r.ok ? String((r.value as { status?: string }).status ?? '?') : '?';
  }
  return out;
}
