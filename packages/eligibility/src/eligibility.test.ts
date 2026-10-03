import { describe, expect, it } from 'vitest';
import type { Scheme } from '@govsathi/shared';
import { evaluate, pickFollowUpFact } from './index';

const base: Scheme = {
  id: 't', level: 'central', stateCodes: [], names: { en: 'T' }, department: 'D', categories: ['finance'], benefits: [],
  rules: [], additionalConditions: false, documents: [], apply: { channels: [], steps: [] }, sources: [], lastVerified: '2026-01-01', dataVersion: 1, updatedOn: '2026-01-01',
  lifecycle: 'published', verification: { level: 'automated', by: 'test', on: '2026-01-01', method: 'test' }, history: [], citations: [], keywords: [],
};
const s = (over: Partial<Scheme>): Scheme => ({ ...base, ...over });

describe('evaluate', () => {
  it('is informational when no rules exist', () => {
    expect(evaluate(s({}), {}).status).toBe('informational_only');
  });
  it('potentially eligible when all rules match', () => {
    const sc = s({ rules: [{ id: 'a', hard: true, rule: { fact: 'age', op: 'between', value: [18, 40] } }] });
    expect(evaluate(sc, { age: 30 }).status).toBe('potentially_eligible');
  });
  it('more info when a hard fact is missing; never guesses', () => {
    const sc = s({ rules: [{ id: 'a', hard: true, rule: { fact: 'age', op: 'gte', value: 60 } }] });
    const r = evaluate(sc, {});
    expect(r.status).toBe('more_info_required');
    expect(r.missingFacts).toEqual(['age']);
  });
  it('excludes on hard mismatch', () => {
    const sc = s({ rules: [{ id: 'a', hard: true, rule: { fact: 'gender', op: 'eq', value: 'female' } }] });
    const r = evaluate(sc, { gender: 'male' });
    expect(r.excluded).toBe(true);
    expect(r.status).toBe('some_criteria_do_not_match');
  });
  it('soft mismatch is not excluded', () => {
    const sc = s({ rules: [{ id: 'a', hard: false, rule: { fact: 'area', op: 'eq', value: 'urban' } }] });
    const r = evaluate(sc, { area: 'rural' });
    expect(r.excluded).toBe(false);
    expect(r.status).toBe('some_criteria_do_not_match');
  });
  it('soft unknown gives potential match', () => {
    const sc = s({
      rules: [
        { id: 'a', hard: true, rule: { fact: 'age', op: 'gte', value: 18 } },
        { id: 'b', hard: false, rule: { fact: 'bpl', op: 'is', value: true } },
      ],
    });
    expect(evaluate(sc, { age: 20 }).status).toBe('potential_match');
  });
  it('handles income ranges conservatively', () => {
    const sc = s({ rules: [{ id: 'a', hard: true, rule: { fact: 'familyIncome', op: 'lte', value: 300000 } }] });
    expect(evaluate(sc, { familyIncome: { min: 0, max: 250000 } }).status).toBe('potentially_eligible');
    expect(evaluate(sc, { familyIncome: { min: 250000, max: 500000 } }).status).toBe('more_info_required');
    expect(evaluate(sc, { familyIncome: { min: 500000, max: null } }).excluded).toBe(true);
  });
  it('anyOf: one match is enough, all mismatches exclude', () => {
    const sc = s({
      rules: [{ id: 'a', hard: true, anyOf: [{ fact: 'category', op: 'in', value: ['sc', 'st'] }, { fact: 'bpl', op: 'is', value: true }] }],
    });
    expect(evaluate(sc, { category: 'sc' }).status).toBe('potentially_eligible');
    expect(evaluate(sc, { category: 'general', bpl: false }).excluded).toBe(true);
    expect(evaluate(sc, { category: 'general' }).status).toBe('more_info_required');
  });
  it('state schemes require a matching state', () => {
    const sc = s({ level: 'state', stateCodes: ['PB'], rules: [{ id: 'a', hard: true, rule: { fact: 'age', op: 'gte', value: 18 } }] });
    expect(evaluate(sc, { age: 30 }).status).toBe('more_info_required');
    expect(evaluate(sc, { age: 30, state: 'RJ' }).excluded).toBe(true);
    expect(evaluate(sc, { age: 30, state: 'PB' }).status).toBe('potentially_eligible');
  });
});

describe('additional conditions', () => {
  it('caps the status at potential_match when the official source lists conditions we do not model', () => {
    const sc = s({ additionalConditions: true, rules: [{ id: 'a', hard: true, rule: { fact: 'age', op: 'gte', value: 18 } }] });
    expect(evaluate(sc, { age: 30 }).status).toBe('potential_match');
  });
});

describe('anyOf with AND groups', () => {
  const sc = s({
    rules: [{ id: 'a', hard: true, anyOf: [{ all: [{ fact: 'gender', op: 'eq', value: 'male' }, { fact: 'age', op: 'gte', value: 65 }] }, { all: [{ fact: 'gender', op: 'eq', value: 'female' }, { fact: 'age', op: 'gte', value: 58 }] }] }],
  });
  it('matches the right branch', () => {
    expect(evaluate(sc, { gender: 'female', age: 60 }).status).toBe('potentially_eligible');
    expect(evaluate(sc, { gender: 'male', age: 60 }).excluded).toBe(true);
    expect(evaluate(sc, { gender: 'male' }).status).toBe('more_info_required');
  });
});

describe('pickFollowUpFact', () => {
  it('asks for the fact that settles the most required criteria and skips declined facts', () => {
    const a = s({ id: 'a', rules: [{ id: 'r', hard: true, rule: { fact: 'age', op: 'gte', value: 60 } }] });
    const b = s({ id: 'b', rules: [{ id: 'r', hard: true, rule: { fact: 'age', op: 'gte', value: 18 } }, { id: 'q', hard: true, rule: { fact: 'area', op: 'eq', value: 'rural' } }] });
    const res = [evaluate(a, {}), evaluate(b, {})];
    expect(pickFollowUpFact(res)).toBe('age');
    expect(pickFollowUpFact(res, ['age'])).toBe('area');
  });
});
