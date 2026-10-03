import { Link, useNavigate, useParams } from 'react-router-dom';
import { SCHEME_CATEGORIES, type SchemeCategory } from '@govsathi/shared';
import { useI18n } from '../../i18n';
import { useApp } from '../../state/AppState';
import { getScheme, listedSchemes } from '../../data/schemes';
import { useDescribe, useEligibility, officialUrl, hostOf } from '../../lib/useDescribe';
import { Button } from '../../components/forms';
import { SchemeCard } from './SchemeCard';
import { StatusBadge } from './parts';
import type { Scheme } from '@govsathi/shared';

export function Saved() {
  const { t } = useI18n();
  const { saved } = useApp();
  const items = saved.map(getScheme).filter((s): s is Scheme => !!s);
  return (
    <section aria-labelledby="saved-title" className="mx-auto max-w-3xl">
      <h1 id="saved-title" className="text-3xl font-bold text-brand">{t('saved.title')}</h1>
      {items.length === 0 ? <p className="mt-4 text-lg">{t('saved.empty')}</p> : <ul className="mt-6 space-y-5">{items.map((s) => <li key={s.id}><SchemeCard scheme={s} /></li>)}</ul>}
    </section>
  );
}

const TILE_COLORS = ['bg-[#e8eef6]', 'bg-[#fdf0e0]', 'bg-[#e4f1ea]', 'bg-[#f3e8f3]'];

export function Explore() {
  const { t, td } = useI18n();
  return (
    <section aria-labelledby="explore-title" className="mx-auto max-w-4xl">
      <h1 id="explore-title" className="text-3xl font-bold text-brand">{t('explore.title')}</h1>
      <p className="mt-2 text-muted">{t('explore.subtitle')}</p>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCHEME_CATEGORIES.map((c, i) => {
          const count = listedSchemes().filter((s) => s.categories.includes(c)).length;
          if (count === 0) return null;
          return (
            <li key={c}>
              <Link to={`/explore/${c}`} className={`flex min-h-24 flex-col justify-between rounded-2xl border border-line p-4 hover:border-brand ${TILE_COLORS[i % TILE_COLORS.length]}`}>
                <span className="text-lg font-bold text-ink">{td(`cat.${c}`)}</span>
                <span className="text-sm text-muted">{t('common.list', { count })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Row({ scheme }: { scheme: Scheme }) {
  const { language } = useI18n();
  const result = useEligibility(scheme);
  const name = language.code === 'hi' && scheme.names.hi ? scheme.names.hi : scheme.names.en;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
      <Link to={`/scheme/${scheme.id}`} lang="en" className="min-w-0 flex-1 font-bold text-brand underline underline-offset-4">{name}</Link>
      <StatusBadge status={result.status} />
    </li>
  );
}

export function ExploreCategory() {
  const { t, td } = useI18n();
  const { category } = useParams<{ category: string }>();
  const cat = SCHEME_CATEGORIES.find((c) => c === category) as SchemeCategory | undefined;
  const items = cat ? listedSchemes().filter((s) => s.categories.includes(cat)) : [];
  return (
    <section aria-labelledby="cat-title" className="mx-auto max-w-3xl">
      <Link to="/explore" className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">← {t('nav.explore')}</Link>
      <h1 id="cat-title" className="mt-2 text-3xl font-bold text-brand">{cat ? td(`cat.${cat}`) : t('explore.title')}</h1>
      {items.length === 0 ? <p className="mt-4">{t('explore.empty')}</p> : (
        <>
          <p className="mt-2 text-muted">{t('explore.showing', { count: items.length })}</p>
          <ul className="mt-5 space-y-3">{items.map((s) => <Row key={s.id} scheme={s} />)}</ul>
        </>
      )}
    </section>
  );
}

export function Compare() {
  const { t, td, language, formatDate } = useI18n();
  const d = useDescribe();
  const { compare, clearCompare, toggleCompare } = useApp();
  const items = compare.map(getScheme).filter((s): s is Scheme => !!s);
  const nav = useNavigate();
  if (items.length < 2) {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-brand">{t('compare.title')}</h1>
        <p className="mt-4 text-lg">{t('compare.empty')}</p>
        <div className="mt-4"><Button onClick={() => nav('/explore')}>{t('nav.explore')}</Button></div>
        {items.length === 1 && <p className="mt-6 font-semibold">{items[0]!.names.en}</p>}
      </section>
    );
  }
  const name = (s: Scheme) => (language.code === 'hi' && s.names.hi ? s.names.hi : s.names.en);
  const th = 'bg-paper px-4 py-3 text-start align-top text-sm font-bold text-ink';
  const td_ = 'px-4 py-3 align-top';
  const rows: { label: string; cell: (s: Scheme) => React.ReactNode }[] = [
    { label: t('compare.purpose'), cell: (s) => (<><p>{s.categories.map((c) => td(`cat.${c}`)).join(' / ')}</p><p className="mt-1 text-muted">{d.dept(s.department)} · {td(`detail.level.${s.level}`)}</p></>) },
    { label: t('detail.benefits'), cell: (s) => <ul className="list-disc ps-5">{s.benefits.map((b, i) => <li key={i}>{d.benefit(b)}</li>)}</ul> },
    { label: t('detail.eligibility'), cell: (s) => (<ul className="list-disc space-y-1 ps-5">{s.stateCodes.length > 0 && <li>{td('rule.state', { states: d.states(s.stateCodes) })}</li>}{s.rules.map((r) => <li key={r.id}>{d.rule(r)}</li>)}</ul>) },
    { label: t('detail.documents'), cell: (s) => <ul className="list-disc ps-5">{s.documents.map((x) => <li key={x}>{td(`doc.${x}`)}</li>)}</ul> },
    { label: t('detail.how'), cell: (s) => (<><ol className="list-decimal ps-5">{s.apply.steps.map((x) => <li key={x}>{td(`step.${x}`)}</li>)}</ol><p className="mt-2 text-muted">{s.apply.channels.map((c) => td(`channel.${c}`)).join(' / ')}</p></>) },
    { label: t('detail.source'), cell: (s) => (<><a href={officialUrl(s)} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline underline-offset-4 [overflow-wrap:anywhere]" dir="ltr">{hostOf(officialUrl(s) ?? s.sources[0]!.url)}</a><p className="mt-1 text-sm text-muted">{t('common.lastVerified', { date: formatDate(s.lastVerified) })}</p></>) },
  ];
  return (
    <section aria-labelledby="cmp-title" className="mx-auto max-w-6xl">
      <h1 id="cmp-title" className="text-3xl font-bold text-brand">{t('compare.title')}</h1>
      <p className="mt-2 text-muted">{t('compare.note')}</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-start">
          <thead>
            <tr className="border-b border-line">
              <td className={th} />
              {items.map((s) => (
                <th key={s.id} scope="col" className={`${th} min-w-56`}>
                  <Link to={`/scheme/${s.id}`} lang="en" className="text-base text-brand underline underline-offset-4">{name(s)}</Link>
                  <div className="mt-2"><button type="button" onClick={() => toggleCompare(s.id)} className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4">{t('common.removeCompare')}</button></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className={`${th} w-36`}>{r.label}</th>
                {items.map((s) => <td key={s.id} className={td_}>{r.cell(s)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4"><Button variant="secondary" onClick={clearCompare}>{t('compare.clear')}</Button></div>
    </section>
  );
}
