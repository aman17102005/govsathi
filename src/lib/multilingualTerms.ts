/**
 * Lightweight Hindi / Punjabi -> English keyword mapping.
 *
 * This is NOT a translation engine. It is a small lookup table that lets a
 * user type a simple question in Hindi or Punjabi and still match against
 * `schemes.json`, whose `keywords`/`name`/`category`/etc. fields are all in
 * English. Each entry maps one Hindi or Punjabi word to one or more English
 * words that already appear in the scheme data.
 *
 * `search.ts` looks up every token from the user's question here and adds
 * any matching English words to the token list before scoring, so the
 * existing English keyword-matching logic in `scoreScheme` keeps working
 * unchanged.
 */
export const MULTILINGUAL_TERMS: Record<string, string[]> = {
  // Farming / agriculture
  'किसान': ['farmer', 'farming', 'agriculture'],
  'खेती': ['farming', 'agriculture'],
  'खेतीबाड़ी': ['farming', 'agriculture'],
  'जमीन': ['land'],
  'ज़मीन': ['land'],
  'फसल': ['crops'],
  'ਕਿਸਾਨ': ['farmer', 'farming', 'agriculture'],
  'ਖੇਤੀ': ['farming', 'agriculture'],
  'ਜ਼ਮੀਨ': ['land'],
  'ਫ਼ਸਲ': ['crops'],
  'ਫਸਲ': ['crops'],

  // Health
  'स्वास्थ्य': ['health'],
  'अस्पताल': ['hospital'],
  'बीमा': ['insurance'],
  'इलाज': ['treatment', 'medical'],
  'बीमारी': ['illness'],
  'ਸਿਹਤ': ['health'],
  'ਹਸਪਤਾਲ': ['hospital'],
  'ਬੀਮਾ': ['insurance'],
  'ਇਲਾਜ': ['treatment', 'medical'],
  'ਬਿਮਾਰੀ': ['illness'],

  // Housing
  'घर': ['house', 'home', 'housing'],
  'मकान': ['house', 'home', 'housing'],
  'आवास': ['housing'],
  'ਘਰ': ['house', 'home', 'housing'],
  'ਮਕਾਨ': ['house', 'home', 'housing'],

  // Girl child / savings
  'बेटी': ['daughter', 'girl'],
  'लड़की': ['girl'],
  'बचत': ['savings'],
  'शादी': ['marriage'],
  'ਧੀ': ['daughter', 'girl'],
  'ਕੁੜੀ': ['girl'],
  'ਬੱਚਤ': ['savings'],
  'ਵਿਆਹ': ['marriage'],

  // Education / scholarship
  'छात्र': ['student'],
  'विद्यार्थी': ['student'],
  'शिक्षा': ['education'],
  'छात्रवृत्ति': ['scholarship'],
  'पढ़ाई': ['study', 'education'],
  'कॉलेज': ['college'],
  'विश्वविद्यालय': ['university'],
  'ਵਿਦਿਆਰਥੀ': ['student'],
  'ਪੜ੍ਹਾਈ': ['study', 'education'],
  'ਸਿੱਖਿਆ': ['education'],
  'ਸਕਾਲਰਸ਼ਿਪ': ['scholarship'],
  'ਕਾਲਜ': ['college'],
  'ਯੂਨੀਵਰਸਿਟੀ': ['university'],

  // Caste
  'जाति': ['caste'],
  'अनुसूचित': ['scheduled'],
  'ਜਾਤ': ['caste'],
  'ਅਨੁਸੂਚਿਤ': ['scheduled'],

  // LPG / cooking gas
  'गैस': ['gas'],
  'रसोई': ['kitchen', 'cooking'],
  'ਗੈਸ': ['gas'],
  'ਰਸੋਈ': ['kitchen', 'cooking'],

  // Pension
  'पेंशन': ['pension'],
  'बुढ़ापा': ['old', 'age'],
  'सेवानिवृत्ति': ['retirement'],
  'ਪੈਨਸ਼ਨ': ['pension'],
  'ਬੁਢਾਪਾ': ['old', 'age'],
  'ਰਿਟਾਇਰਮੈਂਟ': ['retirement'],

  // Business / employment
  'व्यापार': ['business'],
  'दुकान': ['shop', 'business'],
  'कर्ज': ['loan'],
  'लोन': ['loan'],
  'ऋण': ['loan'],
  'स्वरोजगार': ['self', 'employment'],
  'ਕਾਰੋਬਾਰ': ['business'],
  'ਦੁਕਾਨ': ['shop', 'business'],
  'ਲੋਨ': ['loan'],
  'ਕਰਜ਼ਾ': ['loan'],
  'ਕਰਜ਼': ['loan'],
  'ਸਵੈ-ਰੁਜ਼ਗਾਰ': ['self', 'employment'],

  // Bank / financial inclusion
  'बैंक': ['bank'],
  'खाता': ['account'],
  'ਬੈਂਕ': ['bank'],
  'ਖਾਤਾ': ['account'],

  // Income / age / demographics
  'आय': ['income'],
  'आमदनी': ['income'],
  'उम्र': ['age'],
  'साल': ['age', 'years'],
  'महिला': ['women'],
  'औरत': ['women'],
  'गरीब': ['poor'],
  'पंजाब': ['punjab'],
  'ਆਮਦਨ': ['income'],
  'ਉਮਰ': ['age'],
  'ਸਾਲ': ['age', 'years'],
  'ਔਰਤ': ['women'],
  'ਗਰੀਬ': ['poor'],
  'ਪੰਜਾਬ': ['punjab'],
}
