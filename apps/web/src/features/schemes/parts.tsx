import type { CurrentState, Scheme, SchemeCategory } from '@govsathi/shared';
import { stateOf } from '../../data/schemes';
import type { EligibilityResult, EligibilityStatus, Outcome } from '@govsathi/eligibility';
import { useI18n } from '../../i18n';
import { useApp, MAX_COMPARE } from '../../state/AppState';
import { useDescribe } from '../../lib/useDescribe';
import type { MessageKey } from '../../i18n/translate';

const STATUS_STYLE: Record<EligibilityStatus, { cls: string; glyph: string }> = {
  potentially_eligible: { cls: 'bg-green-100 text-green-950 border-green-700', glyph: '✓' },
  potential_match: { cls: 'bg-blue-100 text-blue-950 border-blue-700', glyph: '◐' },
  more_info_required: { cls: 'bg-amber-100 text-amber-950 border-amber-700', glyph: '?' },
  some_criteria_do_not_match: { cls: 'bg-stone-200 text-stone-900 border-stone-600', glyph: '!' },
  informational_only: { cls: 'bg-slate-100 text-slate-900 border-slate-500', glyph: 'i' },
};

/** Status is conveyed by text and a glyph, never by colour alone. */
export function StatusBadge({ status }: { status: EligibilityStatus }) {
  const { td } = useI18n();
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${s.cls}`}>
      <span aria-hidden="true">{s.glyph}</span>
      {td(`status.${status}`)}
    </span>
  );
}

export function CategoryChips({ categories }: { categories: SchemeCategory[] }) {
  const { td } = useI18n();
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <li key={c} className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-muted">{td(`cat.${c}`)}</li>
      ))}
    </ul>
  );
}

const OUTCOME_GLYPH: Record<Outcome, string> = { match: '✓', mismatch: '✕', unknown: '?' };
const OUTCOME_LABEL: Record<Outcome, MessageKey> = { match: 'rulestate.match', mismatch: 'rulestate.mismatch', unknown: 'rulestate.unknown' };
const OUTCOME_CLS: Record<Outcome, string> = { match: 'text-green-800', mismatch: 'text-red-800', unknown: 'text-amber-800' };

/** One criterion with its state; the state is also available to screen readers as text. */
export function RuleLine({ scheme, result, ruleId }: { scheme: Scheme; result: EligibilityResult; ruleId: string }) {
  const { t } = useI18n();
  const d = useDescribe();
  const rule = scheme.rules.find((r) => r.id === ruleId);
  if (!rule) return null;
  const outcome = result.rules.find((r) => r.ruleId === ruleId)?.outcome ?? 'unknown';
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className={`mt-0.5 w-5 shrink-0 text-center font-bold ${OUTCOME_CLS[outcome]}`}>{OUTCOME_GLYPH[outcome]}</span>
      <span>
        {d.rule(rule)}
        <span className="sr-only"> — {t(OUTCOME_LABEL[outcome])}</span>
      </span>
    </li>
  );
}

export function SaveCompareButtons({ id }: { id: string }) {
  const { t } = useI18n();
  const { saved, toggleSaved, compare, toggleCompare } = useApp();
  const isSaved = saved.includes(id);
  const inCompare = compare.includes(id);
  const full = !inCompare && compare.length >= MAX_COMPARE;
  const base = 'min-h-11 rounded-lg border-2 px-4 py-2 text-sm font-bold';
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={isSaved} onClick={() => toggleSaved(id)} className={`${base} ${isSaved ? 'border-brand bg-brand text-white' : 'border-line bg-card text-brand hover:border-brand'}`}>
        {isSaved ? t('common.unsave') : t('common.save')}
      </button>
      <button type="button" aria-pressed={inCompare} disabled={full} title={full ? t('compare.limit') : undefined} onClick={() => toggleCompare(id)} className={`${base} ${inCompare ? 'border-brand bg-brand text-white' : 'border-line bg-card text-brand hover:border-brand'} disabled:opacity-50`}>
        {inCompare ? t('common.removeCompare') : t('common.addCompare')}
      </button>
    </div>
  );
}

const STATE_STYLE: Record<Exclude<CurrentState, 'active'>, { cls: string; glyph: string }> = {
  deadline_approaching: { cls: 'bg-amber-100 text-amber-950 border-amber-700', glyph: '⏱' },
  expired: { cls: 'bg-red-100 text-red-950 border-red-700', glyph: '✕' },
  discontinued: { cls: 'bg-red-100 text-red-950 border-red-700', glyph: '✕' },
  suspended: { cls: 'bg-red-100 text-red-950 border-red-700', glyph: '!' },
  verification_required: { cls: 'bg-amber-100 text-amber-950 border-amber-700', glyph: '?' },
};

/** Shown whenever a scheme is anything other than plainly active: text + glyph, never colour alone. */
export function CurrentStateBadge({ scheme }: { scheme: Scheme }) {
  const { td } = useI18n();
  const st = stateOf(scheme);
  if (st === 'active') return null;
  const s = STATE_STYLE[st];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${s.cls}`}>
      <span aria-hidden="true">{s.glyph}</span>
      {td(`lifecycle.${st}`)}
    </span>
  );
}
