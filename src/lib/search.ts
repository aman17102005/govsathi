import type { Scheme, ScoredScheme } from '../types'

/**
 * Common English filler words that carry no useful signal for matching
 * a user's question against scheme keywords/eligibility text.
 */
const STOPWORDS = new Set([
  'i', 'am', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'for', 'of', 'in', 'on', 'at', 'and', 'or', 'to', 'what', 'which', 'who',
  'my', 'me', 'i\'m', 'from', 'with', 'this', 'that', 'can', 'do', 'does',
  'get', 'give', 'please', 'tell', 'about', 'any', 'some', 'you', 'your',
  'it', 'as', 'by', 'if', 'so', 'we', 'us', 'our', 'will', 'would', 'should',
  'eligible', 'eligibility', 'qualify', 'apply', 'scheme', 'schemes',
  'government', 'govt', 'want', 'need', 'looking', 'have', 'has', 'had',
])

const MIN_TOKEN_LENGTH = 3

/**
 * Breaks a raw question into normalised, meaningful tokens.
 * Numbers (age, income figures) are kept even though they are short,
 * since they can still line up with eligibility text like "18 to 40 years".
 */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[₹,]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')

  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => /^[0-9]+$/.test(t) || (t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t)))
}

/**
 * Scores a single scheme against the tokenised query.
 * Keyword-field matches carry the most weight, since `keywords` is a
 * curated list written specifically to describe who a scheme is for.
 * Matches in the name/category/eligibility/description add smaller
 * amounts of supporting evidence.
 */
function scoreScheme(tokens: string[], scheme: Scheme): number {
  const keywords = scheme.keywords.map((k) => k.toLowerCase())
  const weightedFields: Array<{ text: string; weight: number }> = [
    { text: scheme.name.toLowerCase(), weight: 3 },
    { text: scheme.category.toLowerCase(), weight: 2 },
    { text: scheme.eligibility.toLowerCase(), weight: 2 },
    { text: scheme.description.toLowerCase(), weight: 1 },
  ]

  let score = 0

  for (const token of tokens) {
    const keywordHit = keywords.some((k) => k === token || k.includes(token) || token.includes(k))
    if (keywordHit) {
      score += 4
    }

    for (const field of weightedFields) {
      if (field.text.includes(token)) {
        score += field.weight
      }
    }
  }

  return score
}

/**
 * Ranks every scheme against the user's question and returns the
 * top matches (highest score first). Schemes with a score of 0
 * (no overlap at all) are left out entirely.
 */
export function searchSchemes(query: string, schemes: Scheme[], topN = 3): ScoredScheme[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  return schemes
    .map((scheme) => ({ ...scheme, score: scoreScheme(tokens, scheme) }))
    .filter((scheme) => scheme.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
