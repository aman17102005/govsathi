import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button } from '../../components/forms';
import { ApiError, fetchModels, fetchProviders, type ProviderInfo } from '../../lib/api';
import { aiSettings, onAiSettingsChange } from '../../lib/aiSettings';
import type { MessageKey } from '../../i18n/translate';

type ErrKey = Extract<MessageKey, `ai.error.${string}`>;
const ERR_FOR: Record<string, ErrKey> = {
  ai_invalid_key: 'ai.error.invalid_key',
  ai_quota: 'ai.error.quota',
  ai_unavailable: 'ai.error.unavailable',
  ai_model: 'ai.error.model',
  invalid_ai_config: 'ai.error.invalid',
  rate_limited: 'ai.error.rate',
  network: 'ai.error.unavailable',
};

const field = 'mt-2 block min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 py-2 text-lg text-ink focus:border-brand';

export function AiSettingsPage() {
  const { t } = useI18n();
  const saved = useSyncExternalStore(onAiSettingsChange, aiSettings.get, () => null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState(saved?.provider ?? '');
  const [model, setModel] = useState(saved?.model ?? '');
  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(saved?.remember ?? false);
  const [models, setModels] = useState<{ id: string; label?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrKey | null>(null);
  const [info, setInfo] = useState<{ key: 'ai.modelsLoaded'; count: number } | { key: 'ai.noModelList' } | null>(null);
  const ids = { provider: useId(), model: useId(), key: useId(), list: useId() };

  useEffect(() => {
    fetchProviders().then((p) => { setProviders(p); setProvider((cur) => cur || p[0]?.id || ''); }).catch(() => setError('ai.error.unavailable'));
  }, []);

  const current = apiKey || saved?.apiKey || '';
  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;

  const loadModels = async () => {
    setError(null);
    setInfo(null);
    if (!provider || !current) return void setError('ai.error.invalid');
    setBusy(true);
    try {
      const r = await fetchModels({ provider, apiKey: current });
      setModels(r.models);
      if (r.unsupported || r.models.length === 0) setInfo({ key: 'ai.noModelList' });
      else {
        setInfo({ key: 'ai.modelsLoaded', count: r.models.length });
        if (!model && r.suggested) setModel(r.suggested);
      }
    } catch (e) {
      setError(ERR_FOR[e instanceof ApiError ? e.code : 'network'] ?? 'ai.error.unavailable');
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!provider || !current || !model.trim()) return void setError('ai.error.invalid');
    aiSettings.set({ provider, model: model.trim(), apiKey: current, remember });
    setApiKey('');
  };

  const remove = () => {
    aiSettings.clear();
    setApiKey('');
    setModels([]);
    setInfo(null);
    setError(null);
  };

  return (
    <section aria-labelledby="ai-title" className="mx-auto max-w-2xl">
      <h1 id="ai-title" className="text-3xl font-bold text-brand">{t('ai.title')}</h1>
      <p className="mt-3 text-lg">{t('ai.intro')}</p>
      <p className="mt-3 rounded-xl border-2 border-saffron bg-saffron/10 px-4 py-3 font-semibold">{t('ai.cost')}</p>
      <p className="mt-3 text-muted">{t('ai.storage')}</p>

      <p className="mt-6 text-lg font-bold" aria-live="polite">
        {saved ? t('ai.configured', { provider: providerName(saved.provider), model: saved.model }) : t('ai.notConfigured')}
      </p>

      <form onSubmit={save} className="mt-4 space-y-5" autoComplete="off">
        <div>
          <label htmlFor={ids.provider} className="block text-base font-bold">{t('ai.provider')}</label>
          <select id={ids.provider} value={provider} onChange={(e) => { setProvider(e.target.value); setModels([]); setModel(''); setInfo(null); }} className={field} lang="en">
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.key} className="block text-base font-bold">{t('ai.key')}</label>
          <input id={ids.key} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} autoComplete="off" spellCheck={false} autoCapitalize="off" dir="ltr" placeholder={saved ? '••••••••' : ''} className={field} />
        </div>
        <div>
          <Button type="button" variant="secondary" onClick={() => void loadModels()} disabled={busy}>{t('ai.loadModels')}</Button>
          {info && <p className="mt-2" aria-live="polite">{info.key === 'ai.modelsLoaded' ? t('ai.modelsLoaded', { count: info.count }) : t('ai.noModelList')}</p>}
        </div>
        <div>
          <label htmlFor={ids.model} className="block text-base font-bold">{t('ai.model')}</label>
          <input id={ids.model} list={models.length > 0 ? ids.list : undefined} value={model} onChange={(e) => setModel(e.target.value.trim())} autoComplete="off" spellCheck={false} autoCapitalize="off" dir="ltr" className={field} />
          {models.length > 0 && <datalist id={ids.list}>{models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>}
        </div>
        <label className="flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5" />
          {t('ai.remember')}
        </label>
        {error && <p role="alert" className="font-semibold text-red-800">{t(error)}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{t('ai.save')}</Button>
          {saved && <Button type="button" variant="secondary" onClick={remove}>{t('ai.remove')}</Button>}
        </div>
      </form>
      <p className="mt-8"><Link to="/find" className="font-bold text-brand underline underline-offset-4">← {t('common.back')}</Link></p>
    </section>
  );
}
