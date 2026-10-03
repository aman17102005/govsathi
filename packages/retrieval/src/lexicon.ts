import type { SchemeCategory } from '@govsathi/shared';

/**
 * Query understanding without an LLM: everyday words -> scheme categories.
 * Includes Roman-script spellings (how many people type Indian languages) and native-script words for Hindi and
 * Punjabi. Other languages are covered by their localized category labels (indexed from the locale files) and,
 * when available, by the LLM query-understanding step. This list is a convenience, not a claim of full coverage.
 */
export interface Concept {
  id: string;
  categories: SchemeCategory[];
  triggers: string[];
  /** How strongly a match should steer results (default 1). Generic concepts like "money" steer less. */
  weight?: number;
}

/**
 * Words that ask for help in general but say nothing about the topic. They are removed from queries so that
 * "I need financial help for my education" is about education, not about every scheme that mentions money.
 */
export const STOPWORDS = new Set([
  'i', 'me', 'my', 'we', 'the', 'a', 'an', 'is', 'are', 'am', 'there', 'any', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'need', 'needs', 'want',
  'wants', 'have', 'has', 'get', 'help', 'assistance', 'support', 'financial', 'scheme', 'schemes', 'yojana', 'yojna', 'government', 'govt',
  'sarkari', 'sarkar', 'please', 'looking', 'find', 'about', 'with', 'can', 'how', 'what', 'which', 'some', 'something', 'anything',
  'mujhe', 'mera', 'meri', 'mere', 'hum', 'hai', 'hain', 'ho', 'koi', 'kuch', 'ke', 'ka', 'ki', 'liye', 'lie', 'me', 'mein', 'se', 'ko', 'par',
  'chahiye', 'chahie', 'sahayata', 'madad', 'batao', 'bataye', 'milega', 'mil', 'sakta', 'sakti', 'kya', 'aur', 'ya', 'hu', 'hoon',
  'मुझे', 'मेरा', 'मेरी', 'मेरे', 'के', 'का', 'की', 'को', 'में', 'से', 'पर', 'लिए', 'कोई', 'है', 'हैं', 'और', 'या', 'एक', 'यह', 'वह', 'चाहिए', 'सहायता', 'मदद', 'सरकारी', 'योजना',
  'ਮੈਨੂੰ', 'ਮੇਰਾ', 'ਮੇਰੀ', 'ਲਈ', 'ਹੈ', 'ਦੀ', 'ਦਾ', 'ਦੇ', 'ਨੂੰ', 'ਵਿੱਚ', 'ਤੋਂ', 'ਅਤੇ', 'ਕੋਈ', 'ਚਾਹੀਦੀ', 'ਚਾਹੀਦਾ', 'ਸਰਕਾਰੀ', 'ਮਦਦ', 'ਯੋਜਨਾ',
]);

export const CONCEPTS: Concept[] = [
  { id: 'education', categories: ['education'], triggers: ['education', 'educational', 'study', 'studies', 'student', 'scholarship', 'fees', 'college', 'school', 'university', 'tuition', 'padhai', 'shiksha', 'vidyarthi', 'chhatravritti', 'chatravriti', 'vazifa', 'पढ़ाई', 'पढाई', 'शिक्षा', 'छात्रवृत्ति', 'विद्यार्थी', 'स्कूल', 'कॉलेज', 'ਪੜ੍ਹਾਈ', 'ਸਿੱਖਿਆ', 'ਵਜ਼ੀਫ਼ਾ', 'ਵਜ਼ੀਫਾ', 'ਵਿਦਿਆਰਥੀ', 'ਸਕੂਲ', 'ਕਾਲਜ'] },
  { id: 'agriculture', categories: ['agriculture'], triggers: ['farmer', 'farming', 'farm', 'crop', 'crops', 'kisan', 'kheti', 'fasal', 'krishi', 'agriculture', 'किसान', 'खेती', 'फसल', 'कृषि', 'ਕਿਸਾਨ', 'ਖੇਤੀ', 'ਫ਼ਸਲ', 'ਫਸਲ'] },
  { id: 'health', categories: ['healthcare'], triggers: ['health', 'medical', 'hospital', 'treatment', 'ilaj', 'swasthya', 'bimari', 'dawai', 'sehat', 'इलाज', 'स्वास्थ्य', 'बीमारी', 'अस्पताल', 'ਇਲਾਜ', 'ਸਿਹਤ', 'ਹਸਪਤਾਲ', 'ਬਿਮਾਰੀ'] },
  { id: 'housing', categories: ['housing'], triggers: ['house', 'home', 'housing', 'ghar', 'makaan', 'makan', 'awas', 'awaas', 'shelter', 'घर', 'मकान', 'आवास', 'ਘਰ', 'ਮਕਾਨ'] },
  { id: 'women', categories: ['women'], triggers: ['woman', 'women', 'mahila', 'aurat', 'lady', 'महिला', 'औरत', 'ਔਰਤ', 'ਮਹਿਲਾ'] },
  { id: 'girl', categories: ['children'], triggers: ['girl', 'daughter', 'beti', 'betiyan', 'ladki', 'kanya', 'बेटी', 'लड़की', 'कन्या', 'ਧੀ', 'ਬੇਟੀ', 'ਕੁੜੀ'] },
  { id: 'children', categories: ['children'], triggers: ['child', 'children', 'kids', 'bachche', 'bachcha', 'baccha', 'बच्चे', 'बच्चा', 'ਬੱਚੇ', 'ਬੱਚਾ'] },
  { id: 'senior', categories: ['senior_citizens', 'pension'], triggers: ['senior', 'elderly', 'old', 'oldage', 'bujurg', 'buzurg', 'vridh', 'बुजुर्ग', 'वृद्ध', 'ਬਜ਼ੁਰਗ'] },
  { id: 'disability', categories: ['disability'], triggers: ['disability', 'disabled', 'handicapped', 'divyang', 'viklang', 'apang', 'विकलांग', 'दिव्यांग', 'ਅਪਾਹਜ', 'ਦਿਵਿਆਂਗ'] },
  { id: 'employment', categories: ['employment'], triggers: ['job', 'jobs', 'employment', 'rozgar', 'rojgar', 'naukri', 'रोज़गार', 'रोजगार', 'नौकरी', 'ਰੁਜ਼ਗਾਰ', 'ਨੌਕਰੀ'] },
  { id: 'business', categories: ['entrepreneurship', 'finance'], triggers: ['business', 'startup', 'vyapar', 'dukan', 'udyog', 'entrepreneur', 'shop', 'व्यापार', 'दुकान', 'उद्योग', 'ਕਾਰੋਬਾਰ', 'ਦੁਕਾਨ'] },
  { id: 'finance', categories: ['finance'], weight: 0.5, triggers: ['loan', 'credit', 'karz', 'karza', 'paisa', 'money', 'कर्ज', 'ऋण', 'पैसा', 'ਕਰਜ਼ਾ', 'ਕਰਜ਼'] },
  { id: 'pension', categories: ['pension'], triggers: ['pension', 'retirement', 'पेंशन', 'ਪੈਨਸ਼ਨ'] },
  { id: 'insurance', categories: ['insurance'], triggers: ['insurance', 'bima', 'बीमा', 'ਬੀਮਾ'] },
  { id: 'skill', categories: ['skill_development'], triggers: ['training', 'skill', 'skills', 'kaushal', 'hunar', 'course', 'प्रशिक्षण', 'कौशल', 'हुनर', 'ਸਿਖਲਾਈ', 'ਹੁਨਰ'] },
  { id: 'widow', categories: ['women', 'pension'], triggers: ['widow', 'vidhwa', 'विधवा', 'ਵਿਧਵਾ'] },
  { id: 'pregnancy', categories: ['women', 'healthcare', 'children'], triggers: ['pregnant', 'pregnancy', 'maternity', 'garbhvati', 'गर्भवती', 'ਗਰਭਵਤੀ'] },
  { id: 'marriage', categories: ['women', 'finance'], triggers: ['marriage', 'wedding', 'shaadi', 'shadi', 'vivah', 'शादी', 'विवाह', 'ਵਿਆਹ', 'ਸ਼ਾਦੀ'] },
];
