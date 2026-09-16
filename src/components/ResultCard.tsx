import type { ScoredScheme } from '../types'
import { Language, translations } from '../lib/translations'
import { schemeTranslations } from '../lib/schemeTranslations'

interface ResultCardProps {
  scheme: ScoredScheme
  rank: number
  language: Language
}

export default function ResultCard({
  scheme,
  rank,
  language,
}: ResultCardProps) {
  const t = translations[language]

  const localizedScheme =
    language === 'en'
      ? scheme
      : schemeTranslations[language][scheme.id] || scheme

  return (
    <article className="border border-line bg-white rounded-sm p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-inkmuted mb-1">
            {localizedScheme.category}
          </p>

          <h3 className="font-serif text-xl sm:text-2xl leading-snug text-ink">
            {localizedScheme.name}
          </h3>
        </div>

        <span className="shrink-0 rounded-sm bg-accent/10 text-accentdeep text-xs font-medium px-2.5 py-1 border border-accent/25">
          {t.potentialMatch} #{rank}
        </span>
      </div>

      <p className="mt-4 text-ink/90 leading-relaxed">
        {localizedScheme.description}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium text-ink mb-1.5">
            {t.whoFor}
          </h4>

          <p className="text-sm text-inkmuted leading-relaxed">
            {localizedScheme.eligibility}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-ink mb-1.5">
            {t.docsNeeded}
          </h4>

          <ul className="text-sm text-inkmuted leading-relaxed list-disc list-inside space-y-0.5">
            {localizedScheme.documents.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
