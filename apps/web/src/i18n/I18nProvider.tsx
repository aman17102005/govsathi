import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage, isEntirelyScript, isLanguageCode, type Language, type LanguageCode } from '@govsathi/shared';
import { createTranslator, type DynamicT, type Messages, type TFunction } from './translate';
import { FONT_STACK, loadLanguageFont } from './fonts';
import { storage } from './storage';

const STORAGE_KEY = 'govsathi.language';

// One lazy chunk per language: only the selected locale is downloaded.
const loaders = import.meta.glob<Messages>(['../../../../locales/*/*.json', '!../../../../locales/*/meta.json'], { import: 'default' });

async function loadMessages(code: LanguageCode): Promise<Messages> {
  const files = Object.entries(loaders).filter(([p]) => p.includes(`/locales/${code}/`));
  if (files.length === 0) throw new Error(`No locale bundle for "${code}"`);
  const parts = await Promise.all(files.map(([, load]) => load()));
  return Object.assign({}, ...parts) as Messages;
}

/** Stored choice, else the first supported browser language, else English (itself a selectable language, not a fallback for missing text). */
function detectInitial(): LanguageCode {
  const stored = storage.get(STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;
  for (const tag of navigator.languages ?? []) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLanguageCode(primary)) return primary;
  }
  return DEFAULT_LANGUAGE;
}

export const hasStoredLanguage = () => isLanguageCode(storage.get(STORAGE_KEY));

interface I18nContextValue {
  language: Language;
  t: TFunction;
  /** Same as t, for keys built from data. */
  td: DynamicT;
  /** Raw messages of the active language (used to index vocabulary for offline search). */
  messages: Messages;
  /** Number / money / date formatting for the active language. */
  money: (amount: number) => string;
  formatDate: (iso: string) => string;
  setLanguage: (code: LanguageCode) => Promise<void>;
  isSwitching: boolean;
  /** True when the last attempt to load a language failed (shown via t('error.generic') in the current language). */
  loadFailed: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

interface Active {
  language: Language;
  messages: Messages;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [isSwitching, setSwitching] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const initial = useRef<LanguageCode>(detectInitial());
  const latestRequest = useRef(0);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    const request = ++latestRequest.current;
    setSwitching(true);
    try {
      const language = getLanguage(code);
      const [messages] = await Promise.all([loadMessages(code), loadLanguageFont(language)]);
      if (request !== latestRequest.current) return; // a newer selection superseded this one
      setActive({ language, messages });
      setLoadFailed(false);
      storage.set(STORAGE_KEY, code);
    } catch (e) {
      if (request !== latestRequest.current) return;
      console.error(e);
      setLoadFailed(true);
    } finally {
      if (request === latestRequest.current) setSwitching(false);
    }
  }, []);

  useEffect(() => {
    void setLanguage(initial.current);
  }, [setLanguage]);

  const value = useMemo<I18nContextValue | null>(() => {
    if (!active) return null;
    const t = createTranslator(active.language, active.messages, { strict: import.meta.env.DEV });
    const loc = active.language.formatLocale;
    const nf = new Intl.NumberFormat(loc, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const df = new Intl.DateTimeFormat(loc, { dateStyle: 'medium' });
    const lang = active.language;
    return {
      language: active.language,
      t,
      td: t,
      messages: active.messages,
      money: (n) => nf.format(n),
      formatDate: (iso) => {
        const d = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(d.getTime())) return iso;
        const text = df.format(d);
        // Browsers lack date data for some Indian languages and silently use English or a different script.
        // Never show that: fall back to the language-neutral ISO form (digits only).
        return lang.script === 'latin' || isEntirelyScript(text, lang.script) ? text : iso;
      },
      setLanguage,
      isSwitching,
      loadFailed,
    };
  }, [active, setLanguage, isSwitching, loadFailed]);

  // Keep <html> in sync: lang, dir, script font, title.
  useEffect(() => {
    if (!active) return;
    const { language } = active;
    const root = document.documentElement;
    root.lang = language.code;
    root.dir = language.dir;
    root.dataset.script = language.script;
    root.style.setProperty('--font-body', FONT_STACK[language.script]);
    document.title = active.messages['app.name'] ?? 'GovSathi';
  }, [active]);

  if (!value) {
    // No locale is loaded yet. Render nothing textual; if loading failed, offer a retry labelled only with native language names.
    if (!loadFailed) return <div aria-busy="true" className="min-h-screen" />;
    return (
      <div className="flex min-h-screen flex-wrap items-center justify-center gap-3 p-6">
        {LANGUAGES.map((l) => (
          <button key={l.code} type="button" lang={l.code} onClick={() => void setLanguage(l.code)} className="rounded-lg border px-4 py-3" style={{ fontFamily: FONT_STACK[l.script] }}>
            {l.nameNative} ↻
          </button>
        ))}
      </div>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
