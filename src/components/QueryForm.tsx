import { FormEvent, useState } from 'react'
import { LANGUAGES, Language, translations } from '../lib/translations'

interface QueryFormProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
}

export default function QueryForm({ query, onQueryChange, onSubmit, loading = false }: QueryFormProps) {
  const [language, setLanguage] = useState<Language>('en')
  const t = translations[language]

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <label htmlFor="question" className="block text-sm font-medium text-ink">
          {t.formLabel}
        </label>
        <div className="flex gap-1" role="group" aria-label={t.languageLabel}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`text-xs px-2 py-1 rounded-sm border transition-colors ${
                language === lang
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-inkmuted hover:text-ink'
              }`}
            >
              {translations[lang].languageName}
            </button>
          ))}
        </div>
      </div>

      <textarea
        id="question"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        rows={4}
        placeholder={t.exampleQuestion}
        className="w-full resize-none rounded-sm border border-line bg-white px-4 py-3 text-ink placeholder:text-inkmuted/70 focus:border-accent outline-none transition-colors"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accentdeep disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-sm transition-colors"
        >
          {loading ? t.askButtonLoading : t.askButton}
        </button>
        <button
          type="button"
          onClick={() => onQueryChange(t.exampleQuestion)}
          className="text-sm text-inkmuted hover:text-ink underline underline-offset-2 decoration-line"
        >
          {t.tryExample}
        </button>
      </div>
    </form>
  )
}
