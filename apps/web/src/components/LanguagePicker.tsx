import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { FONT_STACK, loadAllScriptFonts } from '../i18n/fonts';
import { pickerLanguages } from '../i18n/availability';

export function LanguagePicker({ onContinue }: { onContinue: () => void }) {
  const { t, language, setLanguage, isSwitching, loadFailed } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Every language name is drawn in its own script, so every script font is needed on this screen.
  useEffect(() => {
    void loadAllScriptFonts();
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="language-title" className="mx-auto max-w-3xl">
      <h1 id="language-title" ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-brand outline-none sm:text-4xl">
        {t('language.title')}
      </h1>
      <p className="mt-3 text-lg text-muted">{t('language.subtitle')}</p>

      <fieldset aria-busy={isSwitching} className="mt-8 min-w-0 border-0 p-0">
        <legend className="sr-only">{t('language.listLabel')}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pickerLanguages(language.code).map((l) => (
            <label key={l.code} className="block cursor-pointer">
              <input
                type="radio"
                name="language"
                value={l.code}
                checked={language.code === l.code}
                onChange={() => void setLanguage(l.code)}
                className="peer sr-only"
              />
              <span
                lang={l.code}
                dir={l.dir}
                style={{ fontFamily: FONT_STACK[l.script] }}
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-line bg-card px-3 py-2 text-center text-lg transition-colors hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
              >
                {l.nameNative}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {loadFailed && (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
          {t('error.generic')}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isSwitching}
        className="mt-8 min-h-12 w-full rounded-xl bg-brand px-8 py-3 text-lg font-bold text-white hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
      >
        {t('language.continue')}
      </button>
    </section>
  );
}
