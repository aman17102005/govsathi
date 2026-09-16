import { useState } from 'react'
import schemesData from './data/schemes.json'
import type { Scheme, ScoredScheme } from './types'
import QueryForm from './components/QueryForm'
import ResultCard from './components/ResultCard'
import { searchSchemes } from './lib/search'
import { generateAnswer } from './lib/generateAnswer'
import { Language, translations } from './lib/translations'

const schemes = schemesData as Scheme[]

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScoredScheme[]>([])
  const [answer, setAnswer] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<Language>('en')

  const t = translations[language]

  function handleAsk() {
    if (!query.trim()) return

    setIsLoading(true)

    setTimeout(() => {
      const matches = searchSchemes(query, schemes)
      setResults(matches)
      setAnswer(generateAnswer(query, matches, language))
      setHasSearched(true)
      setIsLoading(false)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-content px-5 sm:px-6 py-14 sm:py-20">
        <header>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight">
            {t.title}
          </h1>

          <p className="mt-4 text-inkmuted text-base sm:text-lg leading-relaxed max-w-[38rem]">
            {t.intro}
          </p>
        </header>

        <QueryForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleAsk}
          loading={isLoading}
          language={language}
          onLanguageChange={setLanguage}
        />

        <section className="mt-12">
          {!hasSearched && (
            <p className="text-sm text-inkmuted border-t border-line pt-6">
              {t.emptyState}
            </p>
          )}

          {hasSearched && results.length === 0 && (
            <div className="border-t border-line pt-6">
              <p className="text-ink">
                {t.noResultsTitle}
              </p>

              <p className="mt-1 text-sm text-inkmuted">
                {t.noResultsHint}
              </p>
            </div>
          )}

          {hasSearched && results.length > 0 && (
            <div className="border-t border-line pt-6">
              {answer && (
                <div className="mb-8 rounded-sm border border-accent/25 bg-accent/5 px-5 py-4">
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                    {answer}
                  </p>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="font-serif text-2xl text-ink">
                  {results.length === 1
                    ? t.closestMatch
                    : t.topMatches(results.length)}
                </h2>
              </div>

              <p className="text-sm text-inkmuted mb-6">
                {t.resultsDisclaimer}
              </p>

              <div className="space-y-5">
                {results.map((scheme, index) => (
                  <ResultCard
                    key={scheme.id}
                    scheme={scheme}
                    rank={index + 1}
                    language={language}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-16 pt-6 border-t border-line text-xs text-inkmuted">
          {t.footer(schemes.length)}
        </footer>
      </main>
    </div>
  )
}
