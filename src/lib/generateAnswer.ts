import type { ScoredScheme } from '../types'

/**
 * Builds a short, plain-language answer to the user's question using
 * ONLY the scheme data already retrieved by search.ts. Nothing here is
 * invented or looked up — every sentence is assembled from fields that
 * already exist on the retrieved schemes (name, category, eligibility).
 *
 * This is a placeholder for the future AI layer: same inputs/output
 * shape, but no API call, no key required, fully deterministic.
 */
export function generateAnswer(query: string, results: ScoredScheme[]): string {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return 'Please describe your situation so GovSathi can look for relevant schemes.'
  }

  if (results.length === 0) {
    return (
      "I couldn't find a close match for that in GovSathi's current scheme list. " +
      'Try adding details like your age, occupation, income, or the kind of help ' +
      'you need (education, health, housing, business, etc.).'
    )
  }

  const intro =
    results.length === 1
      ? 'Based on what you shared, here is one potential match:'
      : `Based on what you shared, here are ${results.length} potential matches:`

  const lines = results.map((scheme, index) => {
    return `${index + 1}. ${scheme.name} (${scheme.category}) — ${scheme.eligibility}`
  })

  const disclaimer =
    'These are potential matches based on keyword overlap, not confirmed eligibility. ' +
    "Please verify on the scheme's official portal before applying."

  return [intro, ...lines, disclaimer].join('\n')
}
