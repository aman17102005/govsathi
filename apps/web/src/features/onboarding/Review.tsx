import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ageFromDob, type UserProfile } from '@govsathi/shared';
import { useI18n } from '../../i18n';
import { useApp } from '../../state/AppState';
import { Button } from '../../components/forms';
import { formatIncome } from '../../lib/format';
import { optKey } from '../../lib/options';
import { visibleSteps, type StepId } from './Onboarding';
import type { DynamicT, MessageKey } from '../../i18n/translate';

interface Row {
  label: MessageKey;
  fact?: string;
  value: (p: UserProfile, c: Ctx) => string | undefined;
}
interface Ctx {
  td: DynamicT;
  money: (n: number) => string;
}

const yn = (v: boolean | undefined, c: Ctx) => (v === undefined ? undefined : c.td(v ? 'common.yes' : 'common.no'));
const num = (v: number | undefined) => (v === undefined ? undefined : String(v));
const opt = (v: string | undefined, c: Ctx, g?: 'housing' | 'qualification') => (v === undefined ? undefined : c.td(optKey(v, g)));

const ROWS: Record<StepId, Row[]> = {
  basic: [
    { label: 'onb.name.label', value: (p) => p.name },
    { label: 'onb.age.label', value: (p, c) => { const a = p.dateOfBirth ? ageFromDob(p.dateOfBirth) : p.ageYears; return a === undefined ? undefined : c.td('common.years', { count: a }); } },
    { label: 'onb.gender.label', fact: 'gender', value: (p, c) => opt(p.gender, c) },
    { label: 'onb.state.label', value: (p, c) => (p.state ? c.td(`state.${p.state}`) : undefined) },
    { label: 'onb.area.label', value: (p, c) => opt(p.area, c) },
  ],
  social: [
    { label: 'onb.category.label', fact: 'category', value: (p, c) => opt(p.category, c) },
    { label: 'onb.religion.label', fact: 'minority', value: (p, c) => opt(p.religion, c) },
    { label: 'onb.disability.label', fact: 'disability', value: (p, c) => yn(p.disability, c) },
    { label: 'onb.disabilityType.label', value: (p, c) => opt(p.disabilityType, c) },
    { label: 'onb.disabilityPercent.label', value: (p, c) => (p.disabilityPercent === undefined ? undefined : c.td('common.percent', { count: p.disabilityPercent })) },
    { label: 'onb.veteran.label', fact: 'veteran', value: (p, c) => yn(p.veteran, c) },
  ],
  family: [
    { label: 'onb.marital.label', fact: 'maritalStatus', value: (p, c) => opt(p.maritalStatus, c) },
    { label: 'onb.income.label', fact: 'familyIncome', value: (p, c) => (p.familyIncome ? formatIncome(p.familyIncome, c.td, c.money) : undefined) },
    { label: 'onb.familySize.label', value: (p) => num(p.familySize) },
    { label: 'onb.dependents.label', value: (p) => num(p.dependents) },
    { label: 'onb.children.label', value: (p) => num(p.children) },
    { label: 'onb.daughter.label', value: (p, c) => yn(p.hasDaughterUnder10, c) },
    { label: 'onb.singleParent.label', value: (p, c) => yn(p.singleParent, c) },
  ],
  education: [
    { label: 'onb.eduStatus.label', value: (p, c) => opt(p.educationStatus, c) },
    { label: 'onb.eduLevel.label', value: (p, c) => opt(p.educationLevel, c) },
    { label: 'onb.qualification.label', value: (p, c) => opt(p.qualification, c, 'qualification') },
  ],
  work: [
    { label: 'onb.working.label', value: (p, c) => yn(p.working, c) },
    { label: 'onb.occupation.label', value: (p, c) => opt(p.occupation, c) },
    { label: 'onb.empType.label', value: (p, c) => opt(p.employmentType, c) },
    { label: 'onb.sector.label', value: (p, c) => opt(p.sector, c) },
    { label: 'onb.personalIncome.label', fact: 'personalIncome', value: (p, c) => (p.personalIncome ? formatIncome(p.personalIncome, c.td, c.money) : undefined) },
    { label: 'onb.nonWorking.label', value: (p, c) => opt(p.nonWorking, c) },
    { label: 'onb.jobSeeker.label', value: (p, c) => yn(p.jobSeeker, c) },
  ],
  farming: [
    { label: 'onb.agri.label', value: (p, c) => yn(p.agriculture, c) },
    { label: 'onb.farmerRole.label', value: (p, c) => opt(p.farmerRole, c) },
    { label: 'onb.ownsLand.label', value: (p, c) => yn(p.ownsFarmland, c) },
    { label: 'onb.landHolding.label', value: (p) => num(p.landHoldingHa) },
    { label: 'onb.farmActivity.label', value: (p, c) => opt(p.farmActivity, c) },
  ],
  living: [
    { label: 'onb.housing.label', value: (p, c) => opt(p.housing, c, 'housing') },
    { label: 'onb.lpg.label', value: (p, c) => yn(p.hasLpg, c) },
    { label: 'onb.bank.label', value: (p, c) => yn(p.hasBankAccount, c) },
    { label: 'onb.tax.label', fact: 'incomeTaxPayer', value: (p, c) => yn(p.incomeTaxPayer, c) },
    { label: 'onb.bpl.label', fact: 'bpl', value: (p, c) => yn(p.bpl, c) },
  ],
  special: [{ label: 'onb.special.label', value: (p, c) => (p.circumstances && p.circumstances.length > 0 ? p.circumstances.map((x) => c.td(optKey(x))).join(' / ') : undefined) }],
};

const CONDITIONAL = new Set<MessageKey>([
  'onb.disabilityType.label', 'onb.disabilityPercent.label', 'onb.daughter.label', 'onb.singleParent.label', 'onb.eduLevel.label',
  'onb.occupation.label', 'onb.empType.label', 'onb.sector.label', 'onb.personalIncome.label', 'onb.nonWorking.label',
  'onb.jobSeeker.label', 'onb.farmerRole.label', 'onb.ownsLand.label', 'onb.landHolding.label', 'onb.farmActivity.label',
]);

const STEP_LABEL: Record<StepId, MessageKey> = {
  basic: 'onb.step.basic', social: 'onb.step.social', family: 'onb.step.family', education: 'onb.step.education',
  work: 'onb.step.work', farming: 'onb.step.farming', living: 'onb.step.living', special: 'onb.step.special',
};

export function Review() {
  const { t, td, money } = useI18n();
  const { profile, completeOnboarding } = useApp();
  const nav = useNavigate();
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => h.current?.focus(), []);
  const ctx: Ctx = { td, money };
  return (
    <section aria-labelledby="review-title" className="mx-auto max-w-2xl">
      <h1 id="review-title" ref={h} tabIndex={-1} className="text-3xl font-bold text-brand outline-none">{t('review.title')}</h1>
      <p className="mt-3 text-muted">{t('review.subtitle')}</p>
      <div className="mt-8 space-y-6">
        {visibleSteps(profile).map((step) => (
          <div key={step} className="rounded-xl border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-lg font-bold text-ink">{t(STEP_LABEL[step])}</h2>
              <Link to={`/onboarding/${step}`} className="min-h-11 content-center rounded-lg px-3 font-bold text-brand underline underline-offset-4">{t('common.edit')}</Link>
            </div>
            <dl className="divide-y divide-line">
              {ROWS[step].map((row) => {
                const v = row.value(profile, ctx);
                const skipped = v === undefined && row.fact && profile.skipped?.includes(row.fact);
                // Follow-up questions that only exist when an earlier answer opened them are hidden until answered.
                if (v === undefined && !skipped && CONDITIONAL.has(row.label)) return null;
                return (
                  <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1fr] sm:gap-4">
                    <dt className="text-sm text-muted">{t(row.label)}</dt>
                    <dd className="font-semibold text-ink">{v ?? (skipped ? t('common.skipped') : '—')}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Button onClick={() => { completeOnboarding(); nav('/find'); }}>{t('review.find')}</Button>
      </div>
    </section>
  );
}
