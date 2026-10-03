import fs from 'node:fs';
import path from 'node:path';
import {
  requiredMessageKeys, LIFECYCLE_STATUSES, publicationBlockers,
  ASKABLE_FACTS,
  BENEFIT_PERIODS, BENEFIT_TYPES, CHANNELS, DOCUMENTS, FACT_NAMES, SCHEME_CATEGORIES, STEPS, STATE_CODES,
  type AllOf, type Scheme, type SimpleRule,
} from '@govsathi/shared';

export interface LintIssue {
  file: string;
  message: string;
}

export function listSchemeFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) out.push(p);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort();
}

const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const oneOf = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v);
const isAll = (r: SimpleRule | AllOf): r is AllOf => 'all' in r;

function checkSimple(r: SimpleRule, where: string, err: (m: string) => void) {
  if (!oneOf(FACT_NAMES, r.fact)) err(`${where}: unknown fact "${r.fact}"`);
  else if (!oneOf(ASKABLE_FACTS, r.fact)) err(`${where}: fact "${r.fact}" cannot be asked of the citizen, so the rule could never be resolved`);
  if (!['eq', 'in', 'not_in', 'gte', 'lte', 'between', 'is'].includes(r.op)) err(`${where}: unknown op "${r.op}"`);
  if (r.op === 'between' && !(Array.isArray(r.value) && r.value.length === 2 && r.value.every((n) => typeof n === 'number'))) err(`${where}: "between" needs [min, max]`);
  if ((r.op === 'in' || r.op === 'not_in') && !Array.isArray(r.value)) err(`${where}: "${r.op}" needs an array`);
  if (r.op === 'is' && typeof r.value !== 'boolean') err(`${where}: "is" needs a boolean`);
  if ((r.op === 'gte' || r.op === 'lte') && typeof r.value !== 'number') err(`${where}: "${r.op}" needs a number`);
}

export function lintScheme(s: Scheme, file: string, ids: Set<string>): LintIssue[] {
  const issues: LintIssue[] = [];
  const err = (message: string) => issues.push({ file, message });
  if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) err('id must be kebab-case');
  if (ids.has(s.id)) err(`duplicate id "${s.id}"`);
  ids.add(s.id);
  if (s.level !== 'central' && s.level !== 'state') err('level must be central|state');
  if (s.level === 'central' && s.stateCodes.length > 0) err('central scheme must not list stateCodes');
  if (s.level === 'state' && s.stateCodes.length === 0) err('state scheme needs stateCodes');
  for (const c of s.stateCodes) if (!oneOf(STATE_CODES, c)) err(`unknown state code "${c}"`);
  if (!s.names?.en) err('names.en is required');
  if (!s.department) err('department is required');
  if (s.categories.length === 0) err('at least one category');
  for (const c of s.categories) if (!oneOf(SCHEME_CATEGORIES, c)) err(`unknown category "${c}"`);
  if (s.benefits.length === 0) err('at least one benefit');
  for (const b of s.benefits) {
    if (!oneOf(BENEFIT_TYPES, b.type)) err(`unknown benefit type "${b.type}"`);
    if (b.period && !oneOf(BENEFIT_PERIODS, b.period)) err(`unknown benefit period "${b.period}"`);
    if (b.amount !== undefined && !(typeof b.amount === 'number' && b.amount > 0)) err('benefit amount must be a positive number');
  }
  for (const d of s.documents) if (!oneOf(DOCUMENTS, d)) err(`unknown document "${d}"`);
  for (const c of s.apply.channels) if (!oneOf(CHANNELS, c)) err(`unknown channel "${c}"`);
  for (const st of s.apply.steps) if (!oneOf(STEPS, st)) err(`unknown step "${st}"`);
  if (s.apply.url && !/^https:\/\//.test(s.apply.url)) err('apply.url must be https');
  // Audit trail
  if (s.sources.length === 0) err('at least one source is required');
  for (const src of s.sources) {
    if (!/^https:\/\//.test(src.url)) err(`source url must be https: ${src.url}`);
    if (!src.title || !src.publisher) err('source needs title and publisher');
    if (!isDate(src.accessed)) err('source.accessed must be YYYY-MM-DD');
  }
  if (!isDate(s.lastVerified)) err('lastVerified must be YYYY-MM-DD');
  if (!Number.isInteger(s.dataVersion) || s.dataVersion < 1) err('dataVersion must be a positive integer');
  if (!isDate(s.updatedOn)) err('updatedOn must be YYYY-MM-DD');
  const srcOk = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < s.sources.length;
  s.benefits.forEach((b, i) => { if (b.src !== undefined && !srcOk(b.src)) err(`benefits[${i}].src is not a valid source index`); });
  s.rules.forEach((r) => { if (r.src !== undefined && !srcOk(r.src)) err(`rule "${r.id}".src is not a valid source index`); });
  for (const dsc of s.discrepancies ?? []) {
    if (!dsc.field || !dsc.resolution) err('discrepancy needs field and resolution');
    if (dsc.status !== 'open' && dsc.status !== 'resolved') err('discrepancy status must be open|resolved');
    if (!isDate(dsc.foundOn)) err('discrepancy.foundOn must be YYYY-MM-DD');
    if (dsc.values.length < 2) err('discrepancy needs at least two values');
    if (dsc.used !== undefined && (!srcOk(dsc.used) || !dsc.values.some((v) => v.src === dsc.used))) err('discrepancy.used must be one of the compared sources (or omitted when the claim is withheld)');
    for (const v of dsc.values) if (!srcOk(v.src)) err('discrepancy value has an invalid source index');
  }
  // Lifecycle, audit trail, claim citations
  if (!oneOf(LIFECYCLE_STATUSES, s.lifecycle)) err(`unknown lifecycle "${s.lifecycle}"`);
  if (!s.verification || !oneOf(['unverified', 'automated', 'human'] as const, s.verification.level) || !s.verification.by || !isDate(s.verification.on)) err('verification needs level, by and on');
  if (!Array.isArray(s.history) || s.history.length === 0) err('history must record at least the first version');
  else {
    const last = s.history[s.history.length - 1]!;
    if (last.version !== s.dataVersion) err(`history ends at version ${last.version} but dataVersion is ${s.dataVersion}`);
    for (const h of s.history) if (!isDate(h.date) || !h.change || !h.by) err('history entries need date, change and by');
  }
  if (s.validity) {
    for (const k of ['startDate', 'endDate', 'applicationDeadline', 'effectiveFrom'] as const) if (s.validity[k] !== undefined && !isDate(s.validity[k]!)) err(`validity.${k} must be YYYY-MM-DD`);
    if (s.validity.src !== undefined && !srcOk(s.validity.src)) err('validity.src is not a valid source index');
    if (s.validity.startDate && s.validity.endDate && s.validity.startDate > s.validity.endDate) err('validity.startDate is after endDate');
  }
  if (s.hold && (!s.hold.reason || !isDate(s.hold.since))) err('hold needs reason and since');
  const claimKeys = new Set<string>([...s.benefits.map((_, i) => `benefit:${i}`), ...s.rules.map((r) => `rule:${r.id}`), ...s.documents.map((d) => `document:${d}`), 'apply.url', 'validity', 'name', 'department']);
  for (const c of s.citations) {
    if (!claimKeys.has(c.claim)) err(`citation for unknown claim "${c.claim}"`);
    if (!srcOk(c.src)) err(`citation "${c.claim}" has an invalid source index`);
    if (c.evidence === 'text-match' && !c.quote) err(`text-match citation "${c.claim}" must carry the supporting quote`);
    if (!isDate(c.readOn)) err(`citation "${c.claim}" needs readOn`);
  }
  // A scheme claiming to be public must pass the publication gate (the date-dependent state is checked at runtime).
  if (s.lifecycle === 'published' || s.lifecycle === 'updated') {
    for (const b of publicationBlockers(s, s.lastVerified)) err(`published but blocked: ${b}`);
  }
  // Rules
  const ruleIds = new Set<string>();
  for (const r of s.rules) {
    if (ruleIds.has(r.id)) err(`duplicate rule id "${r.id}"`);
    ruleIds.add(r.id);
    if (r.id.startsWith('__')) err('rule ids must not start with "__"');
    if (!!r.rule === !!r.anyOf) err(`rule "${r.id}" needs exactly one of rule | anyOf`);
    if (r.rule) checkSimple(r.rule, `rule ${r.id}`, err);
    for (const alt of r.anyOf ?? []) {
      if (isAll(alt)) alt.all.forEach((x) => checkSimple(x, `rule ${r.id}`, err));
      else checkSimple(alt, `rule ${r.id}`, err);
    }
  }
  return issues;
}

export function lintAll(dir: string, referenceMessages?: Record<string, string>): { issues: LintIssue[]; count: number } {
  const ids = new Set<string>();
  const issues: LintIssue[] = [];
  const files = listSchemeFiles(dir);
  for (const f of files) {
    let s: Scheme;
    try {
      s = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (e) {
      issues.push({ file: f, message: `invalid JSON: ${(e as Error).message}` });
      continue;
    }
    const rel = path.relative(dir, f);
    const found = lintScheme(s, rel, ids);
    issues.push(...found);
    if (found.length === 0 && referenceMessages) {
      // Every sentence a scheme needs must exist in the reference locale (and therefore, via i18n-check, in all locales).
      try {
        for (const k of requiredMessageKeys(s)) if (!(k in referenceMessages)) issues.push({ file: rel, message: `missing message key "${k}" in the reference locale` });
      } catch (e) {
        issues.push({ file: rel, message: (e as Error).message });
      }
    }
  }
  return { issues, count: files.length };
}
