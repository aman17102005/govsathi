import { useState } from 'react'
import schemesData from './data/schemes.json'
import type { Scheme, ScoredScheme } from './types'
import QueryForm from './components/QueryForm'
import ResultCard from './components/ResultCard'
import { searchSchemes } from './lib/search'

const schemes = schemesData as Scheme[]

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScoredScheme[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  function handleAsk() {
    if (!query.trim()) return
    setResults(searchSchemes(query, schemes))
    setHasSearched(true)
  }

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-content px-5 sm:px-6 py-14 sm:py-20">
        <header>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight">
            GovSathi
          </h1>
          <p className="mt-4 text-inkmuted text-base sm:text-lg leading-relaxed max-w-[38rem]">
            Government schemes are scattered across dozens of websites, written in
            language that's hard to parse. Describe your situation in plain words —
            age, occupation, income, location — and GovSathi looks through a curated
            list of schemes to surface ones worth a closer look.
          </p>
        </header>

        <QueryForm query={query} onQueryChange={setQuery} onSubmit={handleAsk} />

        <section className="mt-12">
          {!hasSearched && (
            <p className="text-sm text-inkmuted border-t border-line pt-6">
              Results will appear here once you ask a question.
            </p>
          )}

          {hasSearched && results.length === 0 && (
            <div className="border-t border-line pt-6">
              <p className="text-ink">
                No schemes in this prototype's list matched your question closely.
              </p>
              <p className="mt-1 text-sm text-inkmuted">
                Try mentioning specifics like your age, occupation, income, or what
                kind of help you're looking for — for example, "education",
                "housing", "health", or "business loan".
              </p>
            </div>
          )}

          {hasSearched && results.length > 0 && (
            <div className="border-t border-line pt-6">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="font-serif text-2xl text-ink">
                  {results.length === 1 ? 'Closest match' : `Top ${results.length} matches`}
                </h2>
              </div>
              <p className="text-sm text-inkmuted mb-6">
                These are potential matches based on keyword overlap with your question,
                not a confirmed eligibility decision. Always verify final eligibility on
                the scheme's official portal before applying.
              </p>
              <div className="space-y-5">
                {results.map((scheme, index) => (
                  <ResultCard key={scheme.id} scheme={scheme} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-16 pt-6 border-t border-line text-xs text-inkmuted">
          Phase 1 prototype — matches questions against a fixed, local list of{' '}
          {schemes.length} schemes using keyword search. No personal data is stored
          or sent anywhere; everything runs in your browser.
        </footer>
      </main>
    </div>
  )
}
