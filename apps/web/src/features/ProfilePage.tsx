import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useApp } from '../state/AppState';
import { Button } from '../components/forms';

export function ProfilePage() {
  const { t } = useI18n();
  const { onboarded, deleteAll } = useApp();
  const nav = useNavigate();
  return (
    <section aria-labelledby="profile-title" className="mx-auto max-w-2xl">
      <h1 id="profile-title" className="text-3xl font-bold text-brand">{t('profile.title')}</h1>
      <p className="mt-2 text-muted">{t('profile.stored')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {onboarded ? (
          <Link to="/review" className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 py-2 font-bold text-white hover:bg-brand-dark">{t('profile.edit')}</Link>
        ) : (
          <>
            <p className="w-full">{t('profile.empty')}</p>
            <Link to="/welcome" className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 py-2 font-bold text-white hover:bg-brand-dark">{t('home.startProfile')}</Link>
          </>
        )}
        <Link to="/language" className="inline-flex min-h-12 items-center rounded-xl border-2 border-brand px-6 py-2 font-bold text-brand hover:bg-paper">{t('language.change')}</Link>
      </div>
      <section className="mt-10 rounded-xl border border-line bg-card p-5">
        <h2 className="text-xl font-bold text-ink">{t('profile.privacy.title')}</h2>
        <p className="mt-2">{t('profile.privacy.body')}</p>
      </section>
      <div className="mt-8">
        <Button variant="secondary" onClick={() => { if (window.confirm(t('profile.deleteConfirm'))) { deleteAll(); window.alert(t('profile.deleteDone')); nav('/welcome'); } }}>
          {t('profile.delete')}
        </Button>
      </div>
    </section>
  );
}
