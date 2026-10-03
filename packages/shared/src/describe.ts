import type { AllOf, Benefit, EligibilityRule, Scheme, SimpleRule } from './scheme';
import { departmentId } from './departments';

/**
 * Turns structured scheme data into localized text WITHOUT any free-form translation:
 * every sentence is a template from the locale files, filled with localized vocabulary.
 * The same functions run in the UI (real `t`) and in the linter (a recording `t`) so the build can prove
 * that every message a scheme needs exists in the reference locale.
 */
export interface DescribeCtx {
  t: (key: string, params?: Record<string, string | number>) => string;
  money: (amount: number) => string;
}

const INCOME_FACTS = new Set(['familyIncome', 'personalIncome']);
const LABELLED_FACTS = new Set([
  'age', 'gender', 'area', 'category', 'familyIncome', 'personalIncome', 'maritalStatus', 'occupation',
  'educationLevel', 'housing', 'disabilityPercent', 'state',
]);

/** Message key of the label for an enumerated fact value. */
export function valueLabelKey(fact: string, value: string): string {
  if (fact === 'state') return `state.${value}`;
  if (fact === 'housing' && value === 'none') return 'opt.housing_none';
  if (fact === 'qualification' && value === 'none') return 'opt.qual_none';
  return `opt.${value}`;
}

function formatNumber(fact: string, n: number, c: DescribeCtx): string {
  if (fact === 'age') return c.t('common.years', { count: n });
  if (INCOME_FACTS.has(fact)) return c.money(n);
  if (fact === 'disabilityPercent') return c.t('common.percent', { count: n });
  return String(n);
}

export function describeSimple(r: SimpleRule, c: DescribeCtx): string {
  if (r.op === 'is') return c.t(`rule.bool.${r.fact}.${String(r.value)}`);
  if (!LABELLED_FACTS.has(r.fact)) throw new Error(`No label defined for fact "${r.fact}"`);
  const fact = c.t(`fact.${r.fact}`);
  switch (r.op) {
    case 'eq':
      return c.t('rule.eq', { fact, value: c.t(valueLabelKey(r.fact, String(r.value))) });
    case 'in':
    case 'not_in': {
      const values = (r.value as readonly (string | number)[]).map((v) => c.t(valueLabelKey(r.fact, String(v)))).join(' / ');
      return c.t(r.op === 'in' ? 'rule.in' : 'rule.not_in', { fact, values });
    }
    case 'gte':
      return c.t('rule.gte', { fact, value: formatNumber(r.fact, r.value as number, c) });
    case 'lte':
      return c.t('rule.lte', { fact, value: formatNumber(r.fact, r.value as number, c) });
    case 'between': {
      const [a, b] = r.value as [number, number];
      return c.t('rule.between', { fact, min: formatNumber(r.fact, a, c), max: formatNumber(r.fact, b, c) });
    }
  }
}

const isAll = (r: SimpleRule | AllOf): r is AllOf => 'all' in r;

export function describeRule(rule: EligibilityRule, c: DescribeCtx): string {
  if (rule.rule) return describeSimple(rule.rule, c);
  const items = (rule.anyOf ?? [])
    .map((alt) => (isAll(alt) ? c.t('rule.all', { items: alt.all.map((x) => describeSimple(x, c)).join('; ') }) : describeSimple(alt, c)))
    .join('; ');
  return c.t('rule.any', { items });
}

export function describeBenefit(b: Benefit, c: DescribeCtx): string {
  const hasAmount = b.amount !== undefined;
  const key = `benefit.${b.type}.${hasAmount ? `amount${b.period ? `.${b.period}` : ''}` : 'none'}`;
  if (!hasAmount) return c.t(key);
  const money = c.money(b.amount!);
  return c.t(key, { amount: b.upTo ? c.t('common.upToAmount', { amount: money }) : money });
}

/** Localized department name; throws for an unknown department so new bodies cannot ship untranslated. */
export function describeDepartment(name: string, c: DescribeCtx): string {
  const id = departmentId(name);
  if (!id) throw new Error(`Department not in the registry: "${name}"`);
  return c.t(`dept.${id}`);
}

export function describeStates(codes: readonly string[], c: DescribeCtx): string {
  return codes.map((s) => c.t(`state.${s}`)).join(' / ');
}

/** Every message key a scheme needs in order to be rendered in any language. */
export function requiredMessageKeys(s: Scheme): string[] {
  const keys = new Set<string>();
  const rec: DescribeCtx = { t: (k) => (keys.add(k), k), money: String };
  for (const b of s.benefits) describeBenefit(b, rec);
  for (const r of s.rules) describeRule(r, rec);
  describeDepartment(s.department, rec);
  for (const c of s.categories) keys.add(`cat.${c}`);
  for (const d of s.documents) keys.add(`doc.${d}`);
  for (const st of s.apply.steps) keys.add(`step.${st}`);
  for (const ch of s.apply.channels) keys.add(`channel.${ch}`);
  for (const st of s.stateCodes) keys.add(`state.${st}`);
  return [...keys];
}
