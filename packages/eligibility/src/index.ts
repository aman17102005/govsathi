import type { AllOf, EligibilityRule, FactName, Facts, Range, Scheme, SimpleRule } from '@govsathi/shared';

/**
 * Deterministic eligibility evaluation. No LLM, no guessing: a missing fact yields `unknown`.
 * The engine can only ever say a citizen MAY qualify; confirmation is the official portal's job.
 */

export type Outcome = 'match' | 'mismatch' | 'unknown';

export type EligibilityStatus =
  | 'potentially_eligible' // every listed criterion matches the information given
  | 'potential_match' // nothing mismatches; only advisory criteria are unknown
  | 'more_info_required' // a required criterion cannot be assessed yet
  | 'some_criteria_do_not_match'
  | 'informational_only'; // the scheme lists no machine-checkable criteria

export interface RuleResult {
  ruleId: string;
  outcome: Outcome;
  hard: boolean;
  /** Facts this rule depends on (used to ask the minimum follow-up). */
  facts: FactName[];
}

export interface EligibilityResult {
  schemeId: string;
  status: EligibilityStatus;
  rules: RuleResult[];
  matchedRuleIds: string[];
  /** Facts that would resolve unknown criteria, required ones first. */
  missingFacts: FactName[];
  /** True when a required criterion (or state applicability) is definitely not met. */
  excluded: boolean;
}

const isRange = (v: unknown): v is Range => typeof v === 'object' && v !== null && 'min' in v;

function evalSimple(rule: SimpleRule, facts: Facts): Outcome {
  const actual = facts[rule.fact];
  if (actual === undefined) return 'unknown';
  const { op, value } = rule;

  if (op === 'is') return actual === value ? 'match' : 'mismatch';
  if (op === 'eq') return actual === value ? 'match' : 'mismatch';
  if (op === 'in' || op === 'not_in') {
    const list = Array.isArray(value) ? (value as readonly (string | number)[]) : [value as string | number];
    const hit = list.includes(actual as string | number);
    return (op === 'in') === hit ? 'match' : 'mismatch';
  }

  // numeric comparisons, with income-style ranges handled conservatively
  if (isRange(actual)) {
    const { min, max } = actual;
    if (op === 'lte') {
      const v = value as number;
      if (max !== null && max <= v) return 'match';
      if (min > v) return 'mismatch';
      return 'unknown';
    }
    if (op === 'gte') {
      const v = value as number;
      if (min >= v) return 'match';
      if (max !== null && max < v) return 'mismatch';
      return 'unknown';
    }
    if (op === 'between') {
      const [a, b] = value as [number, number];
      if (min >= a && max !== null && max <= b) return 'match';
      if ((max !== null && max < a) || min > b) return 'mismatch';
      return 'unknown';
    }
    return 'unknown';
  }
  if (typeof actual !== 'number') return 'unknown';
  if (op === 'gte') return actual >= (value as number) ? 'match' : 'mismatch';
  if (op === 'lte') return actual <= (value as number) ? 'match' : 'mismatch';
  if (op === 'between') {
    const [a, b] = value as [number, number];
    return actual >= a && actual <= b ? 'match' : 'mismatch';
  }
  return 'unknown';
}

const isAll = (r: SimpleRule | AllOf): r is AllOf => 'all' in r;

function evalAlternative(alt: SimpleRule | AllOf, facts: Facts): Outcome {
  if (!isAll(alt)) return evalSimple(alt, facts);
  const outcomes = alt.all.map((r) => evalSimple(r, facts));
  if (outcomes.includes('mismatch')) return 'mismatch';
  return outcomes.every((o) => o === 'match') ? 'match' : 'unknown';
}

const altFacts = (alt: SimpleRule | AllOf): FactName[] => (isAll(alt) ? alt.all.map((r) => r.fact) : [alt.fact]);

function evalRule(rule: EligibilityRule, facts: Facts): RuleResult {
  if (rule.anyOf && rule.anyOf.length > 0) {
    const outcomes = rule.anyOf.map((r) => evalAlternative(r, facts));
    const outcome: Outcome = outcomes.includes('match') ? 'match' : outcomes.every((o) => o === 'mismatch') ? 'mismatch' : 'unknown';
    return { ruleId: rule.id, outcome, hard: rule.hard, facts: [...new Set(rule.anyOf.flatMap(altFacts))] };
  }
  const r = rule.rule!;
  return { ruleId: rule.id, outcome: evalSimple(r, facts), hard: rule.hard, facts: [r.fact] };
}

export function evaluate(scheme: Scheme, facts: Facts): EligibilityResult {
  const results: RuleResult[] = scheme.rules.map((r) => evalRule(r, facts));

  // State applicability is a built-in required criterion.
  if (scheme.stateCodes.length > 0) {
    const s = facts.state;
    const outcome: Outcome = s === undefined ? 'unknown' : (scheme.stateCodes as string[]).includes(s as string) ? 'match' : 'mismatch';
    results.unshift({ ruleId: '__state', outcome, hard: true, facts: ['state'] });
  }

  const excluded = results.some((r) => r.hard && r.outcome === 'mismatch');
  const matchedRuleIds = results.filter((r) => r.outcome === 'match').map((r) => r.ruleId);
  const missing = [
    ...results.filter((r) => r.outcome === 'unknown' && r.hard).flatMap((r) => r.facts),
    ...results.filter((r) => r.outcome === 'unknown' && !r.hard).flatMap((r) => r.facts),
  ];
  const missingFacts = [...new Set(missing)];

  let status: EligibilityStatus;
  if (scheme.rules.length === 0 && scheme.stateCodes.length === 0) status = 'informational_only';
  else if (results.some((r) => r.outcome === 'mismatch')) status = 'some_criteria_do_not_match';
  else if (results.some((r) => r.outcome === 'unknown' && r.hard)) status = 'more_info_required';
  else if (results.some((r) => r.outcome === 'unknown')) status = 'potential_match';
  // Never present a scheme as "potentially eligible" when its official page lists conditions we cannot check.
  else status = scheme.additionalConditions ? 'potential_match' : 'potentially_eligible';

  return { schemeId: scheme.id, status, rules: results, matchedRuleIds, missingFacts, excluded };
}

const STATUS_RANK: Record<EligibilityStatus, number> = {
  potentially_eligible: 0,
  potential_match: 1,
  more_info_required: 2,
  informational_only: 3,
  some_criteria_do_not_match: 4,
};
export const statusRank = (s: EligibilityStatus) => STATUS_RANK[s];

/**
 * Pick the single fact whose answer would settle the most required criteria across the candidates.
 * Facts the citizen already declined to share are never asked again.
 */
export function pickFollowUpFact(results: EligibilityResult[], skipped: readonly string[] = []): FactName | undefined {
  const score = new Map<FactName, number>();
  for (const r of results) {
    if (r.excluded) continue;
    for (const rule of r.rules) {
      if (rule.outcome !== 'unknown') continue;
      for (const f of rule.facts) {
        if (skipped.includes(f)) continue;
        score.set(f, (score.get(f) ?? 0) + (rule.hard ? 2 : 1));
      }
    }
  }
  let best: FactName | undefined;
  let bestScore = 0;
  for (const [f, s] of score) {
    if (s > bestScore) {
      best = f;
      bestScore = s;
    }
  }
  return best;
}
