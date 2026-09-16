import type { ScoredScheme } from '../types'
import type { Language } from './translations'

/**
 * Builds a short, plain-language answer to the user's question using
 * ONLY the scheme data already retrieved by search.ts. Nothing here is
 * invented or looked up — every sentence is assembled from fields that
 * already exist on the retrieved schemes (name, category, eligibility).
 *
 * Only the surrounding phrasing (intro, disclaimer, empty/no-results
 * messages) is localized. Scheme-specific facts (name, category,
 * eligibility) are used exactly as stored in the data, never translated
 * or reworded, so nothing scheme-specific is invented in any language.
 *
 * `language` defaults to 'en' so existing callers that don't pass it
 * keep working unchanged.
 */

interface AnswerStrings {
  emptyQuery: string
  noResults: string
  introSingular: string
  introPlural: (count: number) => string
  disclaimer: string
}

const STRINGS: Record<Language, AnswerStrings> = {
  en: {
    emptyQuery: 'Please describe your situation so GovSathi can look for relevant schemes.',
    noResults:
      "I couldn't find a close match for that in GovSathi's current scheme list. " +
      'Try adding details like your age, occupation, income, or the kind of help ' +
      'you need (education, health, housing, business, etc.).',
    introSingular: 'Based on what you shared, here is one potential match:',
    introPlural: (count) => `Based on what you shared, here are ${count} potential matches:`,
    disclaimer:
      'These are potential matches based on keyword overlap, not confirmed eligibility. ' +
      "Please verify on the scheme's official portal before applying.",
  },
  hi: {
    emptyQuery: 'कृपया अपनी स्थिति बताएं ताकि GovSathi संबंधित योजनाएं खोज सके।',
    noResults:
      'इसके लिए GovSathi की मौजूदा योजना सूची में कोई करीबी मेल नहीं मिला। ' +
      'कृपया अपनी उम्र, पेशा, आय, या ज़रूरत (शिक्षा, स्वास्थ्य, आवास, व्यवसाय आदि) ' +
      'जैसी जानकारी जोड़ें।',
    introSingular: 'आपकी जानकारी के आधार पर, यह एक संभावित मेल है:',
    introPlural: (count) => `आपकी जानकारी के आधार पर, यहां ${count} संभावित मेल हैं:`,
    disclaimer:
      'ये संभावित मेल कीवर्ड समानता पर आधारित हैं, पात्रता की पुष्टि नहीं हैं। ' +
      'कृपया आवेदन करने से पहले योजना की आधिकारिक वेबसाइट पर जानकारी सत्यापित करें।',
  },
  pa: {
    emptyQuery: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਥਿਤੀ ਦੱਸੋ ਤਾਂ ਜੋ GovSathi ਸੰਬੰਧਿਤ ਸਕੀਮਾਂ ਲੱਭ ਸਕੇ।',
    noResults:
      'ਇਸ ਲਈ GovSathi ਦੀ ਮੌਜੂਦਾ ਸਕੀਮ ਸੂਚੀ ਵਿੱਚ ਕੋਈ ਨੇੜਲਾ ਮੇਲ ਨਹੀਂ ਮਿਲਿਆ। ' +
      'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਉਮਰ, ਕਿੱਤਾ, ਆਮਦਨ, ਜਾਂ ਲੋੜ (ਸਿੱਖਿਆ, ਸਿਹਤ, ਰਿਹਾਇਸ਼, ਕਾਰੋਬਾਰ ਆਦਿ) ' +
      'ਬਾਰੇ ਜਾਣਕਾਰੀ ਸ਼ਾਮਲ ਕਰੋ।',
    introSingular: "ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦੇ ਆਧਾਰ 'ਤੇ, ਇਹ ਇੱਕ ਸੰਭਾਵੀ ਮੇਲ ਹੈ:",
    introPlural: (count) => `ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦੇ ਆਧਾਰ 'ਤੇ, ਇੱਥੇ ${count} ਸੰਭਾਵੀ ਮੇਲ ਹਨ:`,
    disclaimer:
      "ਇਹ ਸੰਭਾਵੀ ਮੇਲ ਕੀਵਰਡ ਸਮਾਨਤਾ 'ਤੇ ਆਧਾਰਿਤ ਹਨ, ਯੋਗਤਾ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ। " +
      "ਕਿਰਪਾ ਕਰਕੇ ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਸਕੀਮ ਦੀ ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ 'ਤੇ ਜਾਣਕਾਰੀ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।",
  },
}

export function generateAnswer(
  query: string,
  results: ScoredScheme[],
  language: Language = 'en',
): string {
  const s = STRINGS[language]
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return s.emptyQuery
  }

  if (results.length === 0) {
    return s.noResults
  }

  const intro = results.length === 1 ? s.introSingular : s.introPlural(results.length)

  const lines = results.map((scheme, index) => {
    return `${index + 1}. ${scheme.name} (${scheme.category}) — ${scheme.eligibility}`
  })

  return [intro, ...lines, s.disclaimer].join('\n')
}
