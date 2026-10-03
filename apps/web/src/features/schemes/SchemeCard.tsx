import { Link } from 'react-router-dom';
import type { Scheme, SchemeCategory } from '@govsathi/shared';
import { useI18n } from '../../i18n';
import { officialUrl, useDescribe, useEligibility } from '../../lib/useDescribe';
import { CategoryChips, CurrentStateBadge, RuleLine, SaveCompareButtons, StatusBadge } from './parts';

function Why({ scheme, ai, topics }: { scheme: Scheme; ai?: string; topics: SchemeCategory[] }) {
  const { t, td } = useI18n();
  const d = useDescribe();
  const result = useEligibility(scheme);
  if (ai) return <p>{ai}</p>;
  const matched = scheme.rules.filter((r) => result.matchedRuleIds.includes(r.id)).slice(0, 3);
  return (
    <div className="space-y-2">
      {matched.length > 0 ? (
        <>
          <p>{t('why.matched')}</p>
          <ul className="list-disc ps-6">{matched.map((r) => <li key={r.id}>{d.rule(r)}</li>)}</ul>
        </>
      ) : scheme.rules.length === 0 && scheme.stateCodes.length === 0 ? (
        <p>{t('why.noRules')}</p>
      ) : topics.length > 0 ? (
        <p>{t('why.topic', { topic: td(`cat.${topics[0]}`) })}</p>
      ) : (
        <p>{t('why.topicOnly')}</p>
      )}
      <p className="text-muted">{scheme.level === 'state' ? t('why.state') : t('why.central')}</p>
    </div>
  );
}

/** Result card: name, category, status, why it may be relevant, benefits, eligibility, documents, source, action. */
export function SchemeCard({ scheme, ai, topics = [] }: { scheme: Scheme; ai?: string; topics?: SchemeCategory[] }) {
  const { t, td, language } = useI18n();
  const d = useDescribe();
  const result = useEligibility(scheme);
  const url = officialUrl(scheme);
  const name = language.code === 'hi' && scheme.names.hi ? scheme.names.hi : scheme.names.en;
  const rules = scheme.rules.slice(0, 3);
  return (
    <article aria-labelledby={`n-${scheme.id}`} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`n-${scheme.id}`} lang="en" className="text-xl font-bold text-brand">{name}</h3>
          <p className="mt-1 text-sm text-muted">{d.dept(scheme.department)} · {td(`detail.level.${scheme.level}`)}</p>
        </div>
        <div className="flex flex-col items-start gap-2"><StatusBadge status={result.status} /><CurrentStateBadge scheme={scheme} /></div>
      </div>
      <div className="mt-3"><CategoryChips categories={scheme.categories} /></div>

      <section className="mt-4">
        <h4 className="font-bold text-ink">{t('results.why')}</h4>
        <div className="mt-1"><Why scheme={scheme} ai={ai} topics={topics} /></div>
      </section>

      <section className="mt-4">
        <h4 className="font-bold text-ink">{t('results.benefits')}</h4>
        <ul className="mt-1 list-disc ps-6">{scheme.benefits.map((b, i) => <li key={i}>{d.benefit(b)}</li>)}</ul>
      </section>

      {rules.length > 0 && (
        <section className="mt-4">
          <h4 className="font-bold text-ink">{t('results.eligibility')}</h4>
          <ul className="mt-1 space-y-1">{rules.map((r) => <RuleLine key={r.id} scheme={scheme} result={result} ruleId={r.id} />)}</ul>
          {scheme.rules.length > rules.length && <p className="mt-1 text-sm text-muted">{t('results.moreCriteria', { count: scheme.rules.length - rules.length })}</p>}
        </section>
      )}

      {scheme.documents.length > 0 && (
        <section className="mt-4">
          <h4 className="font-bold text-ink">{t('results.documents')}</h4>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {scheme.documents.slice(0, 4).map((x) => <li key={x}>☐ {td(`doc.${x}`)}</li>)}
          </ul>
          {scheme.documents.length > 4 && <p className="mt-1 text-sm text-muted">+{scheme.documents.length - 4}</p>}
        </section>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link to={`/scheme/${scheme.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">{t('common.viewDetails')}</Link>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border-2 border-brand px-4 py-2 text-sm font-bold text-brand hover:bg-paper">
            {t('common.openOfficial')} ↗
          </a>
        )}
      </div>
      <div className="mt-3"><SaveCompareButtons id={scheme.id} /></div>
    </article>
  );
}
