import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useApp } from '../state/AppState';
import type { MessageKey } from '../i18n/translate';

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path d="M16 6l8 5v2H8v-2l8-5zM10 15h2v7h-2zM15 15h2v7h-2zM20 15h2v7h-2zM8 24h16v2H8z" fill="#fff" />
    </svg>
  );
}

const NAV: { to: string; label: MessageKey; key: 'find' | 'explore' | 'saved' | 'compare' | 'profile' }[] = [
  { to: '/find', label: 'nav.home', key: 'find' },
  { to: '/explore', label: 'nav.explore', key: 'explore' },
  { to: '/saved', label: 'nav.saved', key: 'saved' },
  { to: '/compare', label: 'nav.compare', key: 'compare' },
  { to: '/profile', label: 'nav.profile', key: 'profile' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { saved, compare } = useApp();
  const { pathname } = useLocation();
  const showNav = pathname !== '/language';
  const count = (k: string) => (k === 'saved' ? saved.length : k === 'compare' ? compare.length : 0);
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-14 min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg px-0.5 text-center text-[11px] font-bold leading-tight [overflow-wrap:anywhere] md:min-h-12 md:flex-row md:px-4 md:text-sm ${isActive ? 'bg-brand text-white' : 'text-brand hover:bg-paper'}`;
  const badge = (n: number) => (n > 0 ? <><span className="ms-1 rounded-full bg-[#9a4a00] px-2 text-xs text-white" aria-hidden="true">{n}</span><span className="sr-only"> ({n})</span></> : null);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">
        {t('a11y.skipToContent')}
      </a>
      <div className="h-1 bg-gradient-to-r from-saffron via-white to-leaf" aria-hidden="true" />
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="text-xl font-bold text-brand">{t('app.name')}</span>
          </Link>
          {showNav && (
            <nav aria-label={t('nav.main')} className="hidden gap-1 md:flex">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={linkCls}>{t(n.label)}{badge(count(n.key))}</NavLink>
              ))}
            </nav>
          )}
          {showNav && (
            <Link to="/language" className="min-h-11 content-center rounded-lg border border-line px-4 font-semibold text-brand hover:bg-paper">{t('language.change')}</Link>
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 outline-none sm:px-6 sm:py-12 md:pb-12">
        {children}
      </main>
      <footer className="border-t border-line bg-card">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 text-sm text-muted sm:px-6 md:pb-5">{t('footer.disclaimer')}</p>
      </footer>
      {showNav && (
        <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-0.5 border-t border-line bg-card p-1 md:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls}>
              <span>{t(n.label)}</span>
              {badge(count(n.key))}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
