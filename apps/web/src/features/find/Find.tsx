import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { LanguageCode } from '@govsathi/shared';
import { buildIndex, searchLocally } from '@govsathi/retrieval';
import { useI18n } from '../../i18n';
import { useApp } from '../../state/AppState';
import { getScheme, listedSchemes } from '../../data/schemes';
import { ApiError, looksSensitive, searchApi, type SearchResponse } from '../../lib/api';
import { FactQuestion, isAskable } from '../../lib/factQuestions';
import { Button } from '../../components/forms';
import { SchemeCard } from '../schemes/SchemeCard';
import { pickFollowUpFact } from '@govsathi/eligibility';

type Notice = 'notice.noAi' | 'notice.quota' | 'notice.noSearch' | 'ai.error.invalid_key' | 'ai.error.model';

export function Find() {
  const { t, language, messages } = useI18n();
  const { profile, facts, onboarded, setSkipped } = useApp();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'error.network' | 'error.sensitive' | 'error.emptyQuery' | 'error.generic' | null>(null);
  const [offline, setOffline] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const hasFacts = Object.keys(facts).length > 0;
  const factsKey = JSON.stringify(facts);
  const skippedKey = (profile.skipped ?? []).join(',');

  // Offline index over the language the citizen is using (vocabulary comes from the loaded locale).
  const listed = useMemo(() => listedSchemes(), []);
  const localIndex = useMemo(() => buildIndex(listed, [messages]), [listed, messages]);

  const run = useCallback(async (q: string) => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const r = await searchApi({ query: q, language: language.code as LanguageCode, facts, skipped: profile.skipped ?? [] }, ctl.signal);
      setResp(r);
      setOffline(false);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (e instanceof ApiError && e.code === 'sensitive_input') {
        setError('error.sensitive');
        setResp(null);
      } else {
        // Server unreachable / failing: keep working from the stored scheme data on this device.
        const ranked = searchLocally(localIndex, listed, q, facts);
        const top = ranked.slice(0, 15);
        setResp({
          results: top.map((r) => ({ schemeId: r.scheme.id, score: r.score, status: r.result.status, excluded: r.result.excluded })),
          followUpFact: pickFollowUpFact(top.filter((r) => !r.result.excluded).slice(0, 5).map((r) => r.result), profile.skipped ?? []),
          topics: [],
          aiConfigured: false,
          degraded: {},
        });
        setOffline(true);
        if (!(e instanceof ApiError)) setError('error.generic');
      }
    } finally {
      if (abort.current === ctl) setLoading(false);
    }
    // facts/skipped are read through their serialized keys so the callback is stable between unrelated renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language.code, factsKey, skippedKey, localIndex, listed]);

  // First visit after onboarding: show schemes for the profile straight away.
  useEffect(() => {
    if (onboarded && hasFacts && submitted === null) {
      setSubmitted('');
      void run('');
    }
  }, [onboarded, hasFacts, submitted, run]);

  // When the citizen answers a follow-up (profile changes), refresh the current search.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (submitted === null) return;
    const id = setTimeout(() => void run(submitted), 350);
    return () => clearTimeout(id);
  }, [factsKey, skippedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q && !hasFacts) return void setError('error.emptyQuery');
    if (looksSensitive(q)) return void setError('error.sensitive');
    setSubmitted(q);
    void run(q);
  };

  const notices: Notice[] = [];
  if (offline) notices.push('notice.noSearch');
  else if (resp?.degraded.ai === 'quota') notices.push('notice.quota');
  else if (resp?.degraded.ai === 'unavailable') notices.push('notice.noAi');
  else if (resp?.degraded.ai === 'invalid_key') notices.push('ai.error.invalid_key');
  else if (resp?.degraded.ai === 'model') notices.push('ai.error.model');

  const results = resp?.results ?? [];
  const live = results.filter((r) => !r.excluded);
  const prominent = live.slice(0, 5);
  const more = live.slice(5);
  const excluded = results.filter((r) => r.excluded);
  const follow = resp?.followUpFact && isAskable(resp.followUpFact) ? resp.followUpFact : undefined;
  const examples = ['home.example1', 'home.example2', 'home.example3', 'home.example4'] as const;
  const renderCard = (id: string) => {
    const s = getScheme(id);
    const r = results.find((x) => x.schemeId === id);
    return s ? <li key={id}><SchemeCard scheme={s} ai={r?.why} topics={resp?.topics ?? []} /></li> : null;
  };

  return (
    <section aria-labelledby="find-title" className="mx-auto max-w-3xl">
      <h1 id="find-title" className="text-3xl font-bold text-brand">
        {profile.name ? t('home.hello', { name: profile.name }) : t('home.title')}
      </h1>
      {profile.name && <p className="mt-1 text-xl text-ink">{t('home.title')}</p>}

      <form onSubmit={onSubmit} className="mt-6" role="search">
        <label htmlFor="q" className="sr-only">{t('home.placeholder')}</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="q"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); }}
            placeholder={t('home.placeholder')}
            maxLength={500}
            autoComplete="off"
            aria-invalid={error === 'error.emptyQuery' || error === 'error.sensitive' ? true : undefined}
            aria-describedby={error ? 'q-error' : undefined}
            className="min-h-12 flex-1 rounded-xl border-2 border-line bg-card px-4 text-lg placeholder:text-muted focus:border-brand"
          />
          <Button type="submit" disabled={loading}>{loading ? t('home.searching') : t('home.search')}</Button>
        </div>
        {error && <p id="q-error" role="alert" className="mt-2 font-semibold text-red-800">{t(error)}</p>}
      </form>

      <p className="mt-3 text-sm"><Link to="/ai" className="font-semibold text-brand underline underline-offset-4">{t('ai.open')}</Link></p>

      {!onboarded && (
        <p className="mt-4 rounded-xl border border-line bg-card px-4 py-3">
          {t('home.noProfile')}{' '}
          <Link to="/welcome" className="font-bold text-brand underline underline-offset-4">{t('home.startProfile')}</Link>
        </p>
      )}

      {submitted === null && (
        <div className="mt-6">
          <p className="font-semibold text-muted">{t('home.try')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {examples.map((k) => (
              <li key={k}>
                <button type="button" onClick={() => { setQuery(t(k)); }} className="min-h-11 rounded-full border border-line bg-card px-4 py-2 text-start text-sm hover:border-brand">{t(k)}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div aria-live="polite" className="mt-6">
        {notices.map((n) => (
          <p key={n} className="mb-3 rounded-xl border border-amber-600 bg-amber-50 px-4 py-3 text-amber-950">
            {t(n)}{n.startsWith('ai.') && <>{' '}<Link to="/ai" className="font-bold underline underline-offset-4">{t('ai.open')}</Link></>}
          </p>
        ))}

        {resp && (
          <>
            {prominent.length > 0 ? (
              <p className="text-lg font-semibold text-ink">{resp.intro ?? t('results.count', { count: prominent.length })}</p>
            ) : (
              <p className="text-lg text-ink">{t('results.none')}</p>
            )}

            {follow && (
              <div className="mt-4 rounded-2xl border-2 border-brand bg-card p-5">
                <p className="mb-4 font-bold text-brand">{t('followup.intro')}</p>
                <FactQuestion fact={follow} />
                <div className="mt-4">
                  <Button variant="ghost" onClick={() => setSkipped(follow, true)}>{t('followup.skip')}</Button>
                </div>
              </div>
            )}

            {prominent.length > 0 && (
              <>
                <h2 className="mt-6 text-2xl font-bold text-ink">{t('results.title')}</h2>
                <ul className="mt-4 space-y-5">{prominent.map((r) => renderCard(r.schemeId))}</ul>
                <p className="mt-6 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">{t('results.disclaimer')}</p>
              </>
            )}
            {more.length > 0 && (
              <details className="mt-6 rounded-xl border border-line bg-card p-4">
                <summary className="cursor-pointer font-bold text-brand">{t('results.more')}</summary>
                <ul className="mt-4 space-y-5">{more.map((r) => renderCard(r.schemeId))}</ul>
              </details>
            )}
            {excluded.length > 0 && (
              <details className="mt-4 rounded-xl border border-line bg-card p-4">
                <summary className="cursor-pointer font-bold text-brand">{t('results.others')}</summary>
                <ul className="mt-4 space-y-5">{excluded.slice(0, 6).map((r) => renderCard(r.schemeId))}</ul>
              </details>
            )}
            {prominent.length === 0 && (
              <p className="mt-4"><Link to="/explore" className="font-bold text-brand underline underline-offset-4">{t('nav.explore')}</Link></p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
