export type Language = 'en' | 'hi' | 'pa'

export interface Translation {
  languageName: string
  title: string
  intro: string
  formLabel: string
  exampleQuestion: string
  askButton: string
  askButtonLoading: string
  tryExample: string
  emptyState: string
  loadingState: string
  noResultsTitle: string
  noResultsHint: string
  closestMatch: string
  topMatches: (count: number) => string
  resultsDisclaimer: string
  potentialMatch: string
  whoFor: string
  docsNeeded: string
  footer: (count: number) => string
  languageLabel: string
}

export const LANGUAGES: Language[] = ['en', 'hi', 'pa']

export const translations: Record<Language, Translation> = {
  en: {
    languageName: 'English',
    title: 'GovSathi',
    intro:
      "Government schemes are scattered across dozens of websites, written in language that's hard to parse. Describe your situation in plain words — age, occupation, income, location — and GovSathi looks through a curated list of schemes to surface ones worth a closer look.",
    formLabel: 'Describe your situation',
    exampleQuestion:
      'I am a 19-year-old student from Punjab with family income of ₹3 lakh. What government schemes am I eligible for?',
    askButton: 'Ask GovSathi',
    askButtonLoading: 'Searching…',
    tryExample: 'Try the example question',
    emptyState: 'Results will appear here once you ask a question.',
    loadingState: 'Looking through the scheme list…',
    noResultsTitle: "No schemes in this prototype's list matched your question closely.",
    noResultsHint:
      'Try mentioning specifics like your age, occupation, income, or what kind of help you\'re looking for — for example, "education", "housing", "health", or "business loan".',
    closestMatch: 'Closest match',
    topMatches: (count) => `Top ${count} matches`,
    resultsDisclaimer:
      'These are potential matches based on keyword overlap with your question, not a confirmed eligibility decision. Always verify final eligibility on the scheme\'s official portal before applying.',
    potentialMatch: 'Potential match',
    whoFor: "Who it's generally for",
    docsNeeded: 'Documents usually needed',
    footer: (count) =>
      `Phase 1 prototype — matches questions against a fixed, local list of ${count} schemes using keyword search. No personal data is stored or sent anywhere; everything runs in your browser.`,
    languageLabel: 'Language',
  },
  hi: {
    languageName: 'हिंदी',
    title: 'GovSathi',
    intro:
      'सरकारी योजनाएं दर्जनों वेबसाइटों पर बिखरी हुई हैं और समझने में मुश्किल भाषा में लिखी होती हैं। अपनी स्थिति आसान शब्दों में बताएं — उम्र, पेशा, आय, स्थान — और GovSathi योजनाओं की सूची में से आपके लिए उपयुक्त योजनाएं ढूंढेगा।',
    formLabel: 'अपनी स्थिति बताएं',
    exampleQuestion:
      'मैं पंजाब से 19 साल का छात्र हूं, मेरे परिवार की आय ₹3 लाख है। मैं किन सरकारी योजनाओं के लिए पात्र हूं?',
    askButton: 'GovSathi से पूछें',
    askButtonLoading: 'खोज रहे हैं…',
    tryExample: 'उदाहरण प्रश्न आज़माएं',
    emptyState: 'प्रश्न पूछने के बाद यहां परिणाम दिखाई देंगे।',
    loadingState: 'योजनाओं की सूची देखी जा रही है…',
    noResultsTitle: 'इस सूची में आपके प्रश्न से मेल खाने वाली कोई योजना नहीं मिली।',
    noResultsHint:
      'अपनी उम्र, पेशा, आय या आपको किस तरह की मदद चाहिए, यह बताने की कोशिश करें — जैसे "शिक्षा", "आवास", "स्वास्थ्य" या "बिज़नेस लोन"।',
    closestMatch: 'सबसे नज़दीकी परिणाम',
    topMatches: (count) => `शीर्ष ${count} परिणाम`,
    resultsDisclaimer:
      'ये आपके प्रश्न के शब्दों से मेल खाने वाली संभावित योजनाएं हैं, यह पात्रता की पुष्टि नहीं है। आवेदन करने से पहले हमेशा योजना की आधिकारिक वेबसाइट पर पात्रता की पुष्टि करें।',
    potentialMatch: 'संभावित मेल',
    whoFor: 'यह आम तौर पर किनके लिए है',
    docsNeeded: 'आमतौर पर ज़रूरी दस्तावेज़',
    footer: (count) =>
      `फेज़ 1 प्रोटोटाइप — कीवर्ड खोज का उपयोग करके ${count} योजनाओं की एक स्थिर, स्थानीय सूची से प्रश्नों का मिलान करता है। कोई व्यक्तिगत डेटा सेव या कहीं भेजा नहीं जाता; सब कुछ आपके ब्राउज़र में चलता है।`,
    languageLabel: 'भाषा',
  },
  pa: {
    languageName: 'ਪੰਜਾਬੀ',
    title: 'GovSathi',
    intro:
      'ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਕਈ ਵੈੱਬਸਾਈਟਾਂ ਤੇ ਖਿੱਲਰੀਆਂ ਹੋਈਆਂ ਹਨ ਅਤੇ ਸਮਝਣ ਵਿੱਚ ਔਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਲਿਖੀਆਂ ਹੁੰਦੀਆਂ ਹਨ। ਆਪਣੀ ਸਥਿਤੀ ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਦੱਸੋ — ਉਮਰ, ਕਿੱਤਾ, ਆਮਦਨ, ਥਾਂ — ਅਤੇ GovSathi ਯੋਜਨਾਵਾਂ ਦੀ ਸੂਚੀ ਵਿੱਚੋਂ ਤੁਹਾਡੇ ਲਈ ਢੁਕਵੀਆਂ ਯੋਜਨਾਵਾਂ ਲੱਭੇਗਾ।',
    formLabel: 'ਆਪਣੀ ਸਥਿਤੀ ਦੱਸੋ',
    exampleQuestion:
      'ਮੈਂ ਪੰਜਾਬ ਤੋਂ 19 ਸਾਲ ਦਾ ਵਿਦਿਆਰਥੀ ਹਾਂ, ਮੇਰੇ ਪਰਿਵਾਰ ਦੀ ਆਮਦਨ ₹3 ਲੱਖ ਹੈ। ਮੈਂ ਕਿਹੜੀਆਂ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਲਈ ਯੋਗ ਹਾਂ?',
    askButton: 'GovSathi ਨੂੰ ਪੁੱਛੋ',
    askButtonLoading: 'ਖੋਜ ਹੋ ਰਹੀ ਹੈ…',
    tryExample: 'ਉਦਾਹਰਣ ਸਵਾਲ ਅਜ਼ਮਾਓ',
    emptyState: 'ਸਵਾਲ ਪੁੱਛਣ ਤੋਂ ਬਾਅਦ ਨਤੀਜੇ ਇੱਥੇ ਦਿਖਾਈ ਦੇਣਗੇ।',
    loadingState: 'ਯੋਜਨਾਵਾਂ ਦੀ ਸੂਚੀ ਵੇਖੀ ਜਾ ਰਹੀ ਹੈ…',
    noResultsTitle: 'ਇਸ ਸੂਚੀ ਵਿੱਚ ਤੁਹਾਡੇ ਸਵਾਲ ਨਾਲ ਮੇਲ ਖਾਂਦੀ ਕੋਈ ਯੋਜਨਾ ਨਹੀਂ ਮਿਲੀ।',
    noResultsHint:
      'ਆਪਣੀ ਉਮਰ, ਕਿੱਤਾ, ਆਮਦਨ ਜਾਂ ਤੁਹਾਨੂੰ ਕਿਹੋ ਜਿਹੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ, ਇਹ ਦੱਸਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ — ਜਿਵੇਂ "ਸਿੱਖਿਆ", "ਮਕਾਨ", "ਸਿਹਤ" ਜਾਂ "ਬਿਜ਼ਨਸ ਲੋਨ"।',
    closestMatch: 'ਸਭ ਤੋਂ ਨੇੜਲਾ ਨਤੀਜਾ',
    topMatches: (count) => `ਚੋਟੀ ਦੇ ${count} ਨਤੀਜੇ`,
    resultsDisclaimer:
      'ਇਹ ਤੁਹਾਡੇ ਸਵਾਲ ਦੇ ਸ਼ਬਦਾਂ ਨਾਲ ਮੇਲ ਖਾਂਦੀਆਂ ਸੰਭਾਵਿਤ ਯੋਜਨਾਵਾਂ ਹਨ, ਇਹ ਯੋਗਤਾ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੈ। ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਹਮੇਸ਼ਾ ਯੋਜਨਾ ਦੀ ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ ਤੇ ਯੋਗਤਾ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।',
    potentialMatch: 'ਸੰਭਾਵਿਤ ਮੇਲ',
    whoFor: 'ਇਹ ਆਮ ਤੌਰ ਤੇ ਕਿਹਨਾਂ ਲਈ ਹੈ',
    docsNeeded: 'ਆਮ ਤੌਰ ਤੇ ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼',
    footer: (count) =>
      `ਫੇਜ਼ 1 ਪ੍ਰੋਟੋਟਾਈਪ — ਕੀਵਰਡ ਖੋਜ ਵਰਤ ਕੇ ${count} ਯੋਜਨਾਵਾਂ ਦੀ ਇੱਕ ਸਥਿਰ, ਸਥਾਨਕ ਸੂਚੀ ਨਾਲ ਸਵਾਲਾਂ ਦਾ ਮੇਲ ਕਰਦਾ ਹੈ। ਕੋਈ ਨਿੱਜੀ ਡਾਟਾ ਸੇਵ ਜਾਂ ਕਿਤੇ ਭੇਜਿਆ ਨਹੀਂ ਜਾਂਦਾ; ਸਭ ਕੁਝ ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਚੱਲਦਾ ਹੈ।`,
    languageLabel: 'ਭਾਸ਼ਾ',
  },
}
