import type { Scheme, ScoredScheme } from '../types'
import { MULTILINGUAL_TERMS } from './multilingualTerms'

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

/**
 * Common Hindi/Punjabi filler words (pronouns, "is/are", postpositions).
 * These never appear in `schemes.json`, so leaving them in would be
 * harmless, but dropping them keeps the token list tidier.
 */
const OTHER_SCRIPT_STOPWORDS = new Set([
  'है', 'हैं', 'हूं', 'का', 'के', 'की', 'में', 'से', 'को', 'पर', 'और',
  'यह', 'वह', 'मुझे', 'मेरा', 'मेरी', 'मेरे', 'कोई', 'क्या', 'कैसे', 'लिए',
  'ਹੈ', 'ਹਨ', 'ਹਾਂ', 'ਦਾ', 'ਦੇ', 'ਦੀ', 'ਵਿੱਚ', 'ਤੋਂ', 'ਨੂੰ', 'ਤੇ', 'ਅਤੇ',
  'ਇਹ', 'ਉਹ', 'ਮੈਨੂੰ', 'ਮੇਰਾ', 'ਮੇਰੀ', 'ਮੇਰੇ', 'ਕੋਈ', 'ਕੀ', 'ਕਿਵੇਂ', 'ਲਈ',
])

const MIN_TOKEN_LENGTH = 3
const LATIN_WORD = /^[a-z]+$/

/**
 * Breaks a raw question into normalised, meaningful tokens.
 * Numbers (age, income figures) are kept even though they are short,
 * since they can still line up with eligibility text like "18 to 40 years".
 *
 * Unicode letters are preserved (not just a-z) so Hindi (Devanagari) and
 * Punjabi (Gurmukhi) questions tokenize into real words instead of being
 * stripped out entirely.
 */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[₹,]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')

  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => {
      if (/^[0-9]+$/.test(t)) return true
      // English words: keep the existing length + stopword rules.
      if (LATIN_WORD.test(t)) return t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t)
      // Hindi/Punjabi words: short words like "घर" (house) still matter,
      // so only drop known filler words, not anything below a length cutoff.
      return !OTHER_SCRIPT_STOPWORDS.has(t)
    })
}

/**
 * Expands a tokenised query with English equivalents for any recognised
 * Hindi/Punjabi word, using the lookup table in `multilingualTerms.ts`.
 * This is what lets a Hindi or Punjabi question match English scheme data
 * without touching the scoring logic itself. English tokens that aren't in
 * the lookup table pass through unchanged, so English queries behave
 * exactly as before.
 */
export function expandWithTranslations(tokens: string[]): string[] {
  const expanded = new Set(tokens)
  for (const token of tokens) {
    const mapped = MULTILINGUAL_TERMS[token]
    if (mapped) {
      for (const englishTerm of mapped) expanded.add(englishTerm)
    }
  }
  return Array.from(expanded)
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
  const tokens = expandWithTranslations(tokenize(query))
  if (tokens.length === 0) return []

  return schemes
    .map((scheme) => ({ ...scheme, score: scoreScheme(tokens, scheme) }))
    .filter((scheme) => scheme.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
