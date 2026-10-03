import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LanguagePicker } from './components/LanguagePicker';
import { Welcome } from './components/Welcome';
import { Onboarding } from './features/onboarding/Onboarding';
import { Review } from './features/onboarding/Review';
import { Find } from './features/find/Find';
import { SchemeDetail } from './features/schemes/SchemeDetail';
import { Compare, Explore, ExploreCategory, Saved } from './features/schemes/Lists';
import { ProfilePage } from './features/ProfilePage';
import { AiSettingsPage } from './features/ai/AiSettings';
import { hasStoredLanguage, useI18n } from './i18n';
import { storage } from './i18n/storage';
import { useApp } from './state/AppState';
import { useNavigate } from 'react-router-dom';

const CONFIRMED_KEY = 'govsathi.languageConfirmed';
const languageConfirmed = () => storage.get(CONFIRMED_KEY) === '1' && hasStoredLanguage();

function Home() {
  const { onboarded } = useApp();
  if (!languageConfirmed()) return <Navigate to="/language" replace />;
  return <Navigate to={onboarded ? '/find' : '/welcome'} replace />;
}

/** Everything except the language picker requires a confirmed language. */
function Guarded({ children }: { children: React.ReactNode }) {
  return languageConfirmed() ? <>{children}</> : <Navigate to="/language" replace />;
}

function LanguageRoute() {
  const nav = useNavigate();
  const { onboarded } = useApp();
  return (
    <LanguagePicker
      onContinue={() => {
        storage.set(CONFIRMED_KEY, '1');
        nav(onboarded ? '/find' : '/welcome');
      }}
    />
  );
}

function CrashFallback() {
  const { t } = useI18n();
  return <p role="alert" className="p-6 text-lg">{t('error.generic')}</p>;
}

export function App() {
  return (
    <ErrorBoundary fallback={() => <CrashFallback />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/language" element={<LanguageRoute />} />
          <Route path="/welcome" element={<Guarded><Welcome /></Guarded>} />
          <Route path="/onboarding/:step?" element={<Guarded><Onboarding /></Guarded>} />
          <Route path="/review" element={<Guarded><Review /></Guarded>} />
          <Route path="/find" element={<Guarded><Find /></Guarded>} />
          <Route path="/scheme/:id" element={<Guarded><SchemeDetail /></Guarded>} />
          <Route path="/saved" element={<Guarded><Saved /></Guarded>} />
          <Route path="/compare" element={<Guarded><Compare /></Guarded>} />
          <Route path="/explore" element={<Guarded><Explore /></Guarded>} />
          <Route path="/explore/:category" element={<Guarded><ExploreCategory /></Guarded>} />
          <Route path="/ai" element={<Guarded><AiSettingsPage /></Guarded>} />
          <Route path="/profile" element={<Guarded><ProfilePage /></Guarded>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
