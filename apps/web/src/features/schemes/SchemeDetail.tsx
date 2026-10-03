import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { getScheme, stateOf } from '../../data/schemes';
import { citationFor } from '@govsathi/shared';
import { store } from '../../lib/storage';
import { hostOf, officialUrl, useDescribe, useEligibility } from '../../lib/useDescribe';
import { CategoryChips, CurrentStateBadge, RuleLine, SaveCompareButtons, StatusBadge } from './parts';
import type { Scheme } from '@govsathi/shared';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Checklist({ scheme }: { scheme: Scheme }) {
  const { t, td } = useI18n();
  const key = `govsathi.docs.${scheme.id}`;
  const [done, setDone] = useState<string[]>(() => store.get<string[]>(key, []));
  const toggle = (d: string) => {
    const next = done.includes(d) ? done.filter((x) => x !== d) : [...done, d];
    setDone(next);
    store.set(key, next);
  };
  if (scheme.documents.length === 0) return <p className="text-muted">{t('detail.note.noDocs')}</p>;
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-muted">{t('detail.checklist')}</legend>
      <ul className="space-y-2">
        {scheme.documents.map((d) => (
          <li key={d}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-card px-4 py-2">
              <input type="checkbox" checked={done.includes(d)} onChange={() => toggle(d)} className="h-5 w-5 accent-[var(--color-brand)]" />
              <span>{td(`doc.${d}`)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function SchemeDetail() {
  const { id } = useParams<{ id: string }>();
  const scheme = id ? getScheme(id) : undefined;
  if (!scheme) return <NotFound />;
  return <Detail scheme={scheme} />;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-2xl">
      <p role="alert" className="text-xl">{t('error.notFound')}</p>
      <p className="mt-4"><Link to="/find" className="font-bold text-brand underline underline-offset-4">{t('nav.home')}</Link></p>
    </section>
  );
}

/** "Official source: domain" for the source a claim was read from (domain is never translated). */
function SourceLine({ scheme, src }: { scheme: Scheme; src?: number }) {
  const { t } = useI18n();
  const source = src === undefined ? undefined : scheme.sources[src];
  if (!source) return null;
  return (
    <p className="mt-2 text-sm text-muted">
      {t('common.officialSource')}: <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4" dir="ltr">{hostOf(source.url)}</a>
    </p>
  );
}

/** The single source behind every cited claim in a group, when they all agree; otherwise no per-section line (claims keep their own quotes). */
const commonSrc = (scheme: Scheme, claims: string[]): number | undefined => {
  const srcs = claims.map((c) => citationFor(scheme, c)?.src);
  return srcs.length > 0 && srcs.every((x) => x !== undefined && x === srcs[0]) ? srcs[0] : undefined;
};

function Detail({ scheme }: { scheme: Scheme }) {
  const { t, td, language, formatDate } = useI18n();
  const d = useDescribe();
  const result = useEligibility(scheme);
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h.current?.focus(); window.scrollTo({ top: 0 }); }, [scheme.id]);
  const url = officialUrl(scheme);
  const current = stateOf(scheme);
  const name = language.code === 'hi' && scheme.names.hi ? scheme.names.hi : scheme.names.en;
  return (
    <article aria-labelledby="scheme-title" className="mx-auto max-w-3xl">
      <Link to="/find" className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">← {t('common.back')}</Link>
      <h1 id="scheme-title" ref={h} tabIndex={-1} lang="en" className="mt-2 text-3xl font-bold text-brand outline-none">{name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusBadge status={result.status} />
        <CurrentStateBadge scheme={scheme} />
        <CategoryChips categories={scheme.categories} />
      </div>
      {current !== 'active' && current !== 'deadline_approaching' && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-red-700 bg-red-50 px-4 py-3 font-semibold text-red-950">{t('detail.note.notCurrent')}</p>
      )}
      {(scheme.validity?.endDate || scheme.validity?.applicationDeadline) && (
        <p className="mt-3 font-semibold">
          {scheme.validity.applicationDeadline && <span className="me-4">{t('detail.deadline', { date: formatDate(scheme.validity.applicationDeadline) })}</span>}
          {scheme.validity.endDate && <span>{t('detail.validUntil', { date: formatDate(scheme.validity.endDate) })}</span>}
        </p>
      )}
      <div className="mt-4"><SaveCompareButtons id={scheme.id} /></div>

      <Section id="what" title={t('detail.what')}>
        <p>{t('detail.department')}: <strong>{d.dept(scheme.department)}</strong></p>
        <p className="mt-1">{td(`detail.level.${scheme.level}`)} · {scheme.stateCodes.length > 0 ? t('detail.availableIn', { states: d.states(scheme.stateCodes) }) : t('detail.availableAll')}</p>
      </Section>

      <Section id="benefits" title={t('detail.benefits')}>
        <ul className="list-disc ps-6">{scheme.benefits.map((b, i) => <li key={i}>{d.benefit(b)}</li>)}</ul>
        {scheme.discrepancies?.some((x) => x.field.startsWith('benefits') && (x.status === 'open' || x.used === undefined)) && <p role="note" className="mt-3 rounded-lg border border-saffron bg-saffron/10 p-3 text-sm">{t('detail.note.discrepancy')}</p>}
        <SourceLine scheme={scheme} src={commonSrc(scheme, scheme.benefits.map((_, i) => `benefit:${i}`))} />
      </Section>

      <Section id="who" title={`${t('detail.who')} · ${t('detail.eligibility')}`}>
        {scheme.rules.length > 0 || scheme.stateCodes.length > 0 ? (
          <ul className="space-y-2">
            {scheme.stateCodes.length > 0 && <li className="flex gap-3"><span aria-hidden="true" className="w-5 text-center font-bold">•</span><span>{td('rule.state', { states: d.states(scheme.stateCodes) })}</span></li>}
            {scheme.rules.map((r) => <RuleLine key={r.id} scheme={scheme} result={result} ruleId={r.id} />)}
          </ul>
        ) : (
          <p>{t('why.noRules')}</p>
        )}
        <SourceLine scheme={scheme} src={commonSrc(scheme, scheme.rules.map((r) => `rule:${r.id}`))} />
      </Section>

      <Section id="docs" title={t('detail.documents')}>
        <Checklist scheme={scheme} />
        <SourceLine scheme={scheme} src={commonSrc(scheme, scheme.documents.map((d) => `document:${d}`))} />
      </Section>

      <Section id="how" title={t('detail.how')}>
        {scheme.apply.steps.length > 0 && <ol className="list-decimal space-y-1 ps-6">{scheme.apply.steps.map((s) => <li key={s}>{td(`step.${s}`)}</li>)}</ol>}
      </Section>

      <Section id="where" title={t('detail.where')}>
        <ul className="list-disc ps-6">{scheme.apply.channels.map((c) => <li key={c}>{td(`channel.${c}`)}</li>)}</ul>
        {url ? (
          <p className="mt-4">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 py-2 font-bold text-white hover:bg-brand-dark">{t('common.openOfficial')} ↗</a>
          </p>
        ) : (
          <p className="mt-3 text-muted">{t('detail.note.noLink')}</p>
        )}
      </Section>

      <Section id="source" title={t('detail.source')}>
        <ul className="space-y-3">
          {scheme.sources.map((s) => (
            <li key={s.url} className="rounded-lg border border-line bg-card p-3">
              <a href={s.url} title={s.title} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline underline-offset-4 [overflow-wrap:anywhere]" dir="ltr">{hostOf(s.url)}</a>
              <p className="text-sm text-muted">{[d.publisher(s.publisher), t('detail.accessed', { date: formatDate(s.accessed) })].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold">{t('detail.verified')}: {formatDate(scheme.lastVerified)}</p>
        <p className="mt-1 text-sm text-muted">{scheme.verification.level === 'human' ? t('detail.verification.human', { date: formatDate(scheme.verification.on) }) : t('detail.verification.automated', { date: formatDate(scheme.verification.on) })}</p>
        <p className="mt-1 text-sm text-muted">{t('detail.dataVersion', { version: scheme.dataVersion, date: formatDate(scheme.updatedOn) })}</p>
      </Section>

      <Section id="notes" title={t('detail.notes')}>
        <ul className="list-disc space-y-1 ps-6">
          <li>{t('detail.note.potential')}</li>
          {scheme.additionalConditions && <li>{t('detail.note.additional')}</li>}
          <li>{t('detail.note.noSubmit')}</li>
        </ul>
      </Section>
    </article>
  );
}
