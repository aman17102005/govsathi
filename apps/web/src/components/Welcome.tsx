import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Button } from './forms';

export function Welcome() {
  const { t } = useI18n();
  const nav = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section aria-labelledby="welcome-title" className="mx-auto max-w-2xl">
      <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-brand outline-none sm:text-4xl">{t('welcome.title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('welcome.body')}</p>
      <p className="mt-6 rounded-xl border border-line border-s-4 border-s-leaf bg-card px-5 py-4 text-ink">{t('welcome.privacy')}</p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button onClick={() => nav('/onboarding/basic')}>{t('welcome.start')}</Button>
        <Link to="/find" className="min-h-11 content-center font-bold text-brand underline underline-offset-4">{t('welcome.skipToSearch')}</Link>
      </div>
    </section>
  );
}
