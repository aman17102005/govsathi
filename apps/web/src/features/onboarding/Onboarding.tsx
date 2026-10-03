import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  AREAS, CATEGORIES, DISABILITY_TYPES, EDUCATION_LEVELS, EDUCATION_STATUS, EMPLOYMENT_TYPES, FARMER_ROLES, FARM_ACTIVITIES, GENDERS,
  HOUSING, MARITAL, NON_WORKING, OCCUPATIONS, QUALIFICATIONS, RELIGIONS, SECTORS, STATES, CIRCUMSTANCES, ageFromDob,
  isEntirelyScript, type Circumstance, type UserProfile,
} from '@govsathi/shared';
import { useI18n } from '../../i18n';
import { useApp } from '../../state/AppState';
import { optKey } from '../../lib/options';
import { Button, CheckboxGroup, ChoiceGroup, IncomeField, NumberField, SelectField, TextField, YesNoField } from '../../components/forms';

export const STEP_IDS = ['basic', 'social', 'family', 'education', 'work', 'farming', 'living', 'special'] as const;
export type StepId = (typeof STEP_IDS)[number];

/** Progressive disclosure: only ask what can matter for this person. */
export function visibleSteps(p: UserProfile): StepId[] {
  const age = p.dateOfBirth ? ageFromDob(p.dateOfBirth) : p.ageYears;
  return STEP_IDS.filter((s) => {
    if (s === 'education') return age === undefined || age <= 40 || p.educationStatus !== undefined && p.educationStatus !== 'not_studying';
    if (s === 'farming') return p.area !== 'urban' || p.occupation === 'farmer' || p.occupation === 'agri_labourer' || p.sector === 'agriculture' || p.agriculture === true;
    return true;
  });
}

const STEP_LABEL = {
  basic: 'onb.step.basic', social: 'onb.step.social', family: 'onb.step.family', education: 'onb.step.education',
  work: 'onb.step.work', farming: 'onb.step.farming', living: 'onb.step.living', special: 'onb.step.special',
} as const;

function useBinders() {
  const { profile, update, setSkipped } = useApp();
  const isSkipped = (k: string) => profile.skipped?.includes(k) ?? false;
  /** Props for an optional question that may be declined. `fact` is the name used in the skipped list. */
  const skippable = (field: keyof UserProfile, fact: string) => ({
    skipped: isSkipped(fact) && profile[field] === undefined,
    onSkip: () => {
      update({ [field]: undefined } as Partial<UserProfile>);
      setSkipped(fact, true);
    },
  });
  /** Option values come from the shared enum lists, so the cast to the profile field type is safe. */
  const set = (field: keyof UserProfile, fact?: string) => (v: unknown) => {
    update({ [field]: v } as Partial<UserProfile>);
    if (fact) setSkipped(fact, false);
  };
  return { profile, update, setSkipped, skippable, set };
}

function opts(td: (k: string) => string, values: readonly string[], group?: 'housing' | 'qualification') {
  return values.map((v) => ({ value: v, label: td(optKey(v, group)) }));
}

// ---- Step bodies ----------------------------------------------------------

function DobFields() {
  const { t, language } = useI18n();
  const { profile, update } = useBinders();
  const parts = profile.dateOfBirth?.split('-') ?? [];
  // Partial input (e.g. only the year chosen so far) is kept locally until all three parts are present.
  const [y, setY] = useState(parts[0] ?? '');
  const [m, setM] = useState(parts[1] ? String(Number(parts[1])) : '');
  const [d, setD] = useState(parts[2] ? String(Number(parts[2])) : '');
  const months = useMemo(() => {
    const f = new Intl.DateTimeFormat(language.formatLocale, { month: 'long' });
    const names = Array.from({ length: 12 }, (_, i) => f.format(new Date(2000, i, 1)));
    // Use the browser's month names only if they are in this language's own script; otherwise show month numbers.
    const usable = language.script === 'latin' || names.every((n) => isEntirelyScript(n, language.script));
    return names.map((n, i) => ({ value: String(i + 1), label: usable ? n : String(i + 1) }));
  }, [language.formatLocale, language.script]);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 121 }, (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) }));
  const days = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const commit = (ny: string, nm: string, nd: string) => {
    setY(ny); setM(nm); setD(nd);
    if (ny && nm && nd) update({ dateOfBirth: `${ny}-${nm.padStart(2, '0')}-${nd.padStart(2, '0')}`, ageYears: undefined });
    else update({ dateOfBirth: undefined });
  };
  const complete = Boolean(y && m && d);
  const invalid = complete && ageFromDob(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) === undefined;
  return (
    <div>
      <p className="text-base font-bold text-ink">{t('onb.dob.label')}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <SelectField label={t('onb.dob.day')} value={d || undefined} options={days} onChange={(v) => commit(y, m, v ?? '')} />
        <SelectField label={t('onb.dob.month')} value={m || undefined} options={months} onChange={(v) => commit(y, v ?? '', d)} />
        <SelectField label={t('onb.dob.year')} value={y || undefined} options={years} onChange={(v) => commit(v ?? '', m, d)} />
      </div>
      {invalid && <p role="alert" className="mt-2 text-sm font-semibold text-red-800">{t('error.invalidDate')}</p>}
    </div>
  );
}

function Basic() {
  const { t, td } = useI18n();
  const { profile, update, set, skippable } = useBinders();
  const [forced, setForced] = useState<'age' | 'dob' | null>(null);
  const mode = forced ?? (profile.dateOfBirth ? 'dob' : 'age');
  return (
    <div className="space-y-8">
      <TextField label={t('onb.name.label')} help={t('onb.name.help')} value={profile.name ?? ''} onChange={(v) => update({ name: v || undefined })} optional autoComplete="name" />
      <div className="space-y-4">
        <ChoiceGroup
          legend={t('onb.age.label')}
          columns="grid-cols-2"
          options={[{ value: 'age', label: t('onb.ageMode.age') }, { value: 'dob', label: t('onb.ageMode.dob') }]}
          value={mode}
          onChange={(v) => { setForced(v as 'age' | 'dob'); update(v === 'age' ? { dateOfBirth: undefined } : { ageYears: undefined }); }}
        />
        {mode === 'age' ? (
          <NumberField label={t('onb.age.label')} value={profile.ageYears} onChange={(v) => update({ ageYears: v, dateOfBirth: undefined })} min={0} max={120} error={t('error.invalidAge')} />
        ) : (
          <DobFields />
        )}
      </div>
      <ChoiceGroup legend={t('onb.gender.label')} options={opts(td, GENDERS)} value={profile.gender} onChange={set('gender', 'gender')} {...skippable('gender', 'gender')} />
      <SelectField label={t('onb.state.label')} value={profile.state} onChange={(v) => update({ state: v as UserProfile['state'] })} options={STATES.map((s) => ({ value: s.code, label: td(`state.${s.code}`) })).sort((a, b) => a.label.localeCompare(b.label))} />
      <ChoiceGroup legend={t('onb.area.label')} columns="grid-cols-2" options={opts(td, AREAS)} value={profile.area} onChange={set('area')} />
    </div>
  );
}

function Social() {
  const { t, td } = useI18n();
  const { profile, update, set, skippable, setSkipped } = useBinders();
  return (
    <div className="space-y-8">
      <ChoiceGroup legend={t('onb.category.label')} help={t('onb.category.help')} columns="grid-cols-2 sm:grid-cols-4" options={opts(td, CATEGORIES)} value={profile.category} onChange={set('category', 'category')} {...skippable('category', 'category')} />
      <ChoiceGroup legend={t('onb.religion.label')} help={t('onb.religion.help')} columns="grid-cols-2 sm:grid-cols-4" options={opts(td, RELIGIONS)} value={profile.religion} onChange={set('religion', 'minority')} {...skippable('religion', 'minority')} />
      <YesNoField legend={t('onb.disability.label')} value={profile.disability} onChange={(v) => { update(v ? { disability: true } : { disability: false, disabilityType: undefined, disabilityPercent: undefined }); setSkipped('disability', false); }} {...skippable('disability', 'disability')} />
      {profile.disability && (
        <div className="space-y-6 rounded-xl border border-line bg-card p-4">
          <ChoiceGroup legend={t('onb.disabilityType.label')} options={opts(td, [...DISABILITY_TYPES.filter((x) => x !== 'other'), 'other'])} value={profile.disabilityType} onChange={set('disabilityType')} />
          <NumberField label={t('onb.disabilityPercent.label')} value={profile.disabilityPercent} onChange={(v) => update({ disabilityPercent: v })} min={0} max={100} optional />
        </div>
      )}
      <YesNoField legend={t('onb.veteran.label')} value={profile.veteran} onChange={set('veteran', 'veteran')} {...skippable('veteran', 'veteran')} />
    </div>
  );
}

function Family() {
  const { t, td } = useI18n();
  const { profile, update, set, skippable } = useBinders();
  const hasKids = (profile.children ?? 0) > 0;
  return (
    <div className="space-y-8">
      <ChoiceGroup legend={t('onb.marital.label')} options={opts(td, MARITAL)} value={profile.maritalStatus} onChange={set('maritalStatus', 'maritalStatus')} {...skippable('maritalStatus', 'maritalStatus')} />
      <IncomeField legend={t('onb.income.label')} value={profile.familyIncome} onChange={(v) => update({ familyIncome: v })} {...skippable('familyIncome', 'familyIncome')} />
      <NumberField label={t('onb.familySize.label')} value={profile.familySize} onChange={(v) => update({ familySize: v })} min={1} max={60} optional />
      <NumberField label={t('onb.dependents.label')} value={profile.dependents} onChange={(v) => update({ dependents: v })} min={0} max={60} optional />
      <NumberField label={t('onb.children.label')} value={profile.children} onChange={(v) => update(v === undefined || v === 0 ? { children: v, hasDaughterUnder10: undefined, singleParent: undefined } : { children: v })} min={0} max={30} optional />
      {hasKids && <YesNoField legend={t('onb.daughter.label')} value={profile.hasDaughterUnder10} onChange={set('hasDaughterUnder10')} />}
      {hasKids && profile.maritalStatus && profile.maritalStatus !== 'married' && (
        <YesNoField legend={t('onb.singleParent.label')} value={profile.singleParent} onChange={set('singleParent')} />
      )}
    </div>
  );
}

function Education() {
  const { t, td } = useI18n();
  const { profile, update, set } = useBinders();
  const studying = profile.educationStatus && profile.educationStatus !== 'not_studying';
  return (
    <div className="space-y-8">
      <ChoiceGroup legend={t('onb.eduStatus.label')} options={opts(td, EDUCATION_STATUS)} value={profile.educationStatus} onChange={(v) => update(v === 'not_studying' ? { educationStatus: 'not_studying', educationLevel: undefined } : { educationStatus: v as UserProfile['educationStatus'] })} />
      {studying && <ChoiceGroup legend={t('onb.eduLevel.label')} options={opts(td, EDUCATION_LEVELS)} value={profile.educationLevel} onChange={set('educationLevel')} />}
      <ChoiceGroup legend={t('onb.qualification.label')} options={opts(td, QUALIFICATIONS, 'qualification')} value={profile.qualification} onChange={set('qualification')} />
    </div>
  );
}

function Work() {
  const { t, td } = useI18n();
  const { profile, update, set, skippable } = useBinders();
  return (
    <div className="space-y-8">
      <YesNoField legend={t('onb.working.label')} value={profile.working} onChange={(v) => update(v ? { working: true, nonWorking: undefined } : { working: false, employmentType: undefined, occupation: undefined, sector: undefined, personalIncome: undefined })} />
      {profile.working === true && (
        <>
          <ChoiceGroup legend={t('onb.occupation.label')} options={opts(td, OCCUPATIONS)} value={profile.occupation} onChange={set('occupation')} />
          <ChoiceGroup legend={t('onb.empType.label')} options={opts(td, [...EMPLOYMENT_TYPES.filter((x) => x !== 'other'), 'other'])} value={profile.employmentType} onChange={set('employmentType')} />
          <ChoiceGroup legend={t('onb.sector.label')} options={opts(td, [...SECTORS.filter((x) => x !== 'other'), 'other'])} value={profile.sector} onChange={set('sector')} />
          <IncomeField legend={t('onb.personalIncome.label')} value={profile.personalIncome} onChange={(v) => update({ personalIncome: v })} {...skippable('personalIncome', 'personalIncome')} />
        </>
      )}
      {profile.working === false && (
        <>
          <ChoiceGroup legend={t('onb.nonWorking.label')} options={opts(td, [...NON_WORKING.filter((x) => x !== 'other'), 'other'])} value={profile.nonWorking} onChange={set('nonWorking')} />
          {(profile.nonWorking === 'unemployed' || profile.nonWorking === 'looking_for_work' || profile.nonWorking === 'student') && (
            <YesNoField legend={t('onb.jobSeeker.label')} value={profile.jobSeeker} onChange={set('jobSeeker')} />
          )}
        </>
      )}
    </div>
  );
}

function Farming() {
  const { t, td } = useI18n();
  const { profile, update, set } = useBinders();
  return (
    <div className="space-y-8">
      <YesNoField legend={t('onb.agri.label')} value={profile.agriculture} onChange={(v) => update(v ? { agriculture: true } : { agriculture: false, farmerRole: undefined, ownsFarmland: false, landHoldingHa: undefined, farmActivity: undefined })} />
      {profile.agriculture && (
        <>
          <ChoiceGroup legend={t('onb.farmerRole.label')} options={opts(td, FARMER_ROLES)} value={profile.farmerRole} onChange={set('farmerRole')} />
          <YesNoField legend={t('onb.ownsLand.label')} value={profile.ownsFarmland} onChange={(v) => update(v ? { ownsFarmland: true } : { ownsFarmland: false, landHoldingHa: undefined })} />
          {profile.ownsFarmland && <NumberField label={t('onb.landHolding.label')} value={profile.landHoldingHa} onChange={(v) => update({ landHoldingHa: v })} decimal optional />}
          <ChoiceGroup legend={t('onb.farmActivity.label')} options={opts(td, [...FARM_ACTIVITIES.filter((x) => x !== 'other'), 'other'])} value={profile.farmActivity} onChange={set('farmActivity')} />
        </>
      )}
    </div>
  );
}

function Living() {
  const { t, td } = useI18n();
  const { profile, set, skippable } = useBinders();
  return (
    <div className="space-y-8">
      <ChoiceGroup legend={t('onb.housing.label')} options={opts(td, HOUSING, 'housing')} value={profile.housing} onChange={set('housing')} />
      <YesNoField legend={t('onb.lpg.label')} value={profile.hasLpg} onChange={set('hasLpg')} />
      <YesNoField legend={t('onb.bank.label')} value={profile.hasBankAccount} onChange={set('hasBankAccount')} />
      <YesNoField legend={t('onb.tax.label')} value={profile.incomeTaxPayer} onChange={set('incomeTaxPayer', 'incomeTaxPayer')} {...skippable('incomeTaxPayer', 'incomeTaxPayer')} />
      <YesNoField legend={t('onb.bpl.label')} value={profile.bpl} onChange={set('bpl', 'bpl')} {...skippable('bpl', 'bpl')} />
    </div>
  );
}

function Special() {
  const { t, td } = useI18n();
  const { profile, update } = useBinders();
  const age = profile.dateOfBirth ? ageFromDob(profile.dateOfBirth) : profile.ageYears;
  // Only offer circumstances that could apply to this person.
  const offered = CIRCUMSTANCES.filter((c) => {
    if (c === 'pregnant_or_lactating') return profile.gender !== 'male' && (age === undefined || (age >= 15 && age <= 49));
    if (c === 'orphan') return age === undefined || age <= 25;
    if (c === 'shg_member') return profile.gender !== 'male';
    return true;
  });
  return (
    <CheckboxGroup<Circumstance>
      legend={t('onb.special.label')}
      options={offered.map((c) => ({ value: c, label: td(optKey(c)) }))}
      value={profile.circumstances ?? []}
      onChange={(v) => update({ circumstances: v })}
    />
  );
}

const BODY: Record<StepId, () => React.JSX.Element> = { basic: Basic, social: Social, family: Family, education: Education, work: Work, farming: Farming, living: Living, special: Special };

export function Onboarding() {
  const { t } = useI18n();
  const { profile } = useApp();
  const nav = useNavigate();
  const { step } = useParams<{ step: string }>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = visibleSteps(profile);
  const current = STEP_IDS.find((s) => s === step);
  useEffect(() => { headingRef.current?.focus(); window.scrollTo({ top: 0 }); }, [step]);
  if (!current) return <Navigate to={`/onboarding/${steps[0]}`} replace />;
  // A step can become hidden after earlier answers change; move on rather than show an irrelevant page.
  if (!steps.includes(current)) return <Navigate to={`/onboarding/${steps[Math.min(steps.length - 1, STEP_IDS.indexOf(current))] ?? steps[0]}`} replace />;
  const idx = steps.indexOf(current);
  const Body = BODY[current];
  const go = (dir: 1 | -1) => {
    const target = steps[idx + dir];
    if (target) nav(`/onboarding/${target}`);
    else nav(dir === 1 ? '/review' : '/welcome');
  };
  return (
    <section aria-labelledby="step-title" className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-muted">{t('common.step', { current: idx + 1, total: steps.length })}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={idx + 1} aria-label={t('common.step', { current: idx + 1, total: steps.length })}>
        <div className="h-full bg-brand" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </div>
      <h1 id="step-title" ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-bold text-brand outline-none">{t(STEP_LABEL[current])}</h1>
      <p className="mt-2 text-sm text-muted">{t('onb.privacyNote')}</p>
      <div className="mt-8"><Body /></div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => go(-1)}>{t('common.back')}</Button>
        <Button onClick={() => go(1)}>{t('common.next')}</Button>
      </div>
    </section>
  );
}
