import { AREAS, CATEGORIES, EDUCATION_LEVELS, GENDERS, HOUSING, MARITAL, OCCUPATIONS, STATES, type AskableFact, type Circumstance, type UserProfile } from '@govsathi/shared';
import { useI18n } from '../i18n';
import { useApp } from '../state/AppState';
import { ChoiceGroup, IncomeField, NumberField, SelectField, YesNoField } from '../components/forms';
import { optKey } from './options';
import type { MessageKey } from '../i18n/translate';

/** Question text per askable fact (reuses the onboarding labels). */
export const FACT_LABEL: Record<AskableFact, MessageKey> = {
  age: 'onb.age.label', gender: 'onb.gender.label', state: 'onb.state.label', area: 'onb.area.label', category: 'onb.category.label',
  disability: 'onb.disability.label', disabilityPercent: 'onb.disabilityPercent.label', maritalStatus: 'onb.marital.label',
  familyIncome: 'onb.income.label', personalIncome: 'onb.personalIncome.label', educationLevel: 'onb.eduLevel.label',
  occupation: 'onb.occupation.label', farmer: 'onb.agri.label', landOwner: 'onb.ownsLand.label', housing: 'onb.housing.label',
  hasLpg: 'onb.lpg.label', hasBankAccount: 'onb.bank.label', incomeTaxPayer: 'onb.tax.label', bpl: 'onb.bpl.label',
  pregnantOrLactating: 'onb.pregnant.label', wantsBusiness: 'onb.wantsBusiness.label', hasDaughterUnder10: 'onb.daughter.label',
};

export const isAskable = (f: string): f is AskableFact => f in FACT_LABEL;

const toggleCircumstance = (p: UserProfile, c: Circumstance, on: boolean): Circumstance[] => {
  const set = new Set(p.circumstances ?? []);
  if (on) set.add(c); else set.delete(c);
  return [...set];
};

/** Inline control that records one answer into the on-device profile. The caller re-runs the search when it changes. */
export function FactQuestion({ fact }: { fact: AskableFact }) {
  const { t, td } = useI18n();
  const { profile, update, setSkipped } = useApp();
  const label = t(FACT_LABEL[fact]);
  const answered = () => setSkipped(fact, false);
  const choices = (values: readonly string[], group?: 'housing') => values.map((v) => ({ value: v, label: td(optKey(v, group)) }));
  const yesNo = (value: boolean | undefined, apply: (v: boolean) => Partial<UserProfile>) => (
    <YesNoField legend={label} value={value} onChange={(v) => { update(apply(v)); answered(); }} />
  );
  switch (fact) {
    case 'age': return <NumberField label={label} value={profile.ageYears} onChange={(v) => { update({ ageYears: v, dateOfBirth: undefined }); answered(); }} min={0} max={120} error={t('error.invalidAge')} />;
    case 'gender': return <ChoiceGroup legend={label} options={choices(GENDERS)} value={profile.gender} onChange={(v) => { update({ gender: v as UserProfile['gender'] }); answered(); }} />;
    case 'area': return <ChoiceGroup legend={label} columns="grid-cols-2" options={choices(AREAS)} value={profile.area} onChange={(v) => { update({ area: v as UserProfile['area'] }); answered(); }} />;
    case 'category': return <ChoiceGroup legend={label} columns="grid-cols-2 sm:grid-cols-4" options={choices(CATEGORIES)} value={profile.category} onChange={(v) => { update({ category: v as UserProfile['category'] }); answered(); }} />;
    case 'state': return <SelectField label={label} value={profile.state} onChange={(v) => { update({ state: v as UserProfile['state'] }); answered(); }} options={STATES.map((s) => ({ value: s.code, label: td(`state.${s.code}`) }))} />;
    case 'maritalStatus': return <ChoiceGroup legend={label} options={choices(MARITAL)} value={profile.maritalStatus} onChange={(v) => { update({ maritalStatus: v as UserProfile['maritalStatus'] }); answered(); }} />;
    case 'occupation': return <ChoiceGroup legend={label} options={choices(OCCUPATIONS)} value={profile.occupation} onChange={(v) => { update({ occupation: v as UserProfile['occupation'], working: true }); answered(); }} />;
    case 'educationLevel': return <ChoiceGroup legend={label} options={choices(EDUCATION_LEVELS)} value={profile.educationLevel} onChange={(v) => { update({ educationLevel: v as UserProfile['educationLevel'], educationStatus: profile.educationStatus ?? 'college' }); answered(); }} />;
    case 'housing': return <ChoiceGroup legend={label} options={choices(HOUSING, 'housing')} value={profile.housing} onChange={(v) => { update({ housing: v as UserProfile['housing'] }); answered(); }} />;
    case 'familyIncome': return <IncomeField legend={label} value={profile.familyIncome} onChange={(v) => { update({ familyIncome: v }); answered(); }} />;
    case 'personalIncome': return <IncomeField legend={label} value={profile.personalIncome} onChange={(v) => { update({ personalIncome: v }); answered(); }} />;
    case 'disabilityPercent': return <NumberField label={label} value={profile.disabilityPercent} onChange={(v) => { update({ disabilityPercent: v }); answered(); }} min={0} max={100} />;
    case 'disability': return yesNo(profile.disability, (v) => ({ disability: v }));
    case 'farmer': return yesNo(profile.agriculture, (v) => ({ agriculture: v }));
    case 'landOwner': return yesNo(profile.ownsFarmland, (v) => (v ? { ownsFarmland: true, agriculture: true } : { ownsFarmland: false }));
    case 'incomeTaxPayer': return yesNo(profile.incomeTaxPayer, (v) => ({ incomeTaxPayer: v }));
    case 'hasBankAccount': return yesNo(profile.hasBankAccount, (v) => ({ hasBankAccount: v }));
    case 'hasLpg': return yesNo(profile.hasLpg, (v) => ({ hasLpg: v }));
    case 'bpl': return yesNo(profile.bpl, (v) => ({ bpl: v }));
    case 'hasDaughterUnder10': return yesNo(profile.hasDaughterUnder10, (v) => ({ hasDaughterUnder10: v }));
    case 'pregnantOrLactating': return yesNo(profile.circumstances?.includes('pregnant_or_lactating'), (v) => ({ circumstances: toggleCircumstance(profile, 'pregnant_or_lactating', v) }));
    case 'wantsBusiness': return yesNo(profile.circumstances?.includes('wants_start_business'), (v) => ({ circumstances: toggleCircumstance(profile, 'wants_start_business', v) }));
  }
}
