import { ageFromDob, type Range, type UserProfile } from './profile';
import type { StateCode } from './geo';

/**
 * Facts are the flat, derived view of a profile that eligibility rules are written against.
 * They are also the ONLY personal data ever sent to the server (name, DOB and district are not facts).
 */
export const FACT_NAMES = [
  'age', 'gender', 'state', 'area', 'category', 'minority', 'disability', 'disabilityPercent', 'veteran', 'maritalStatus',
  'widowed', 'familyIncome', 'personalIncome', 'educationStatus', 'educationLevel', 'working', 'occupation', 'farmer', 'landOwner', 'housing',
  'hasLpg', 'hasBankAccount', 'incomeTaxPayer', 'bpl', 'pregnantOrLactating', 'orphan', 'shgMember', 'migrant',
  'wantsBusiness', 'hasDaughterUnder10', 'senior', 'woman',
] as const;
export type FactName = (typeof FACT_NAMES)[number];

export type FactValue = string | number | boolean | Range;
export type Facts = Partial<Record<FactName, FactValue>>;

const MINORITY_RELIGIONS = new Set(['muslim', 'christian', 'sikh', 'buddhist', 'jain', 'parsi']);

export function deriveFacts(p: UserProfile, today = new Date()): Facts {
  const f: Facts = {};
  const set = <K extends FactName>(k: K, v: FactValue | undefined) => {
    if (v !== undefined) f[k] = v;
  };
  const age = p.dateOfBirth ? ageFromDob(p.dateOfBirth, today) : p.ageYears;
  set('age', age);
  set('gender', p.gender);
  set('state', p.state as StateCode | undefined);
  set('area', p.area);
  set('category', p.category);
  if (p.religion) set('minority', MINORITY_RELIGIONS.has(p.religion));
  set('disability', p.disability);
  if (p.disability) set('disabilityPercent', p.disabilityPercent);
  set('veteran', p.veteran);
  set('maritalStatus', p.maritalStatus);
  if (p.maritalStatus) set('widowed', p.maritalStatus === 'widowed');
  set('familyIncome', p.familyIncome);
  set('personalIncome', p.personalIncome);
  set('educationStatus', p.educationStatus);
  set('educationLevel', p.educationLevel);
  // "Not studying" is an answer, not a gap: student-only criteria then fail instead of staying "unknown". The same is
  // assumed at 60+ when the question was never shown (a plausibility bound, documented in docs/privacy-and-trust.md).
  if (f.educationLevel === undefined && (p.educationStatus === 'not_studying' || (age !== undefined && age >= 60 && p.educationStatus === undefined))) {
    f.educationLevel = 'not_studying';
  }
  set('working', p.working);
  set('occupation', p.occupation);
  if (p.agriculture !== undefined) set('farmer', p.agriculture && p.farmerRole !== 'agri_labourer' ? true : p.agriculture);
  set('landOwner', p.ownsFarmland);
  set('housing', p.housing);
  set('hasLpg', p.hasLpg);
  set('hasBankAccount', p.hasBankAccount);
  set('incomeTaxPayer', p.incomeTaxPayer);
  set('bpl', p.bpl);
  const c = p.circumstances;
  if (c) {
    set('pregnantOrLactating', c.includes('pregnant_or_lactating'));
    set('orphan', c.includes('orphan'));
    set('shgMember', c.includes('shg_member'));
    set('migrant', c.includes('migrant_worker'));
    set('wantsBusiness', c.includes('wants_start_business'));
  }
  // Biological bounds, not a guess about the person: pregnancy/breastfeeding is ruled out for men and outside ages 12-55,
  // unless the citizen said otherwise. This avoids asking an irrelevant question and listing impossible matches.
  if (f.pregnantOrLactating === undefined && (p.gender === 'male' || (age !== undefined && (age < 12 || age > 55)))) f.pregnantOrLactating = false;
  set('hasDaughterUnder10', p.hasDaughterUnder10);
  if (age !== undefined) set('senior', age >= 60);
  if (p.gender) set('woman', p.gender === 'female');
  return f;
}

/** Facts the assistant can ask the citizen about (every rule in the scheme data must use one of these). */
export const ASKABLE_FACTS = [
  'age', 'gender', 'state', 'area', 'category', 'disability', 'disabilityPercent', 'maritalStatus', 'familyIncome', 'personalIncome',
  'educationLevel', 'occupation', 'farmer', 'landOwner', 'housing', 'hasLpg', 'hasBankAccount', 'incomeTaxPayer', 'bpl',
  'pregnantOrLactating', 'wantsBusiness', 'hasDaughterUnder10',
] as const satisfies readonly FactName[];
export type AskableFact = (typeof ASKABLE_FACTS)[number];
