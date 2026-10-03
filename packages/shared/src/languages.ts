/**
 * Language registry: the single source of truth for every UI language.
 * Adding a language = add an entry here + a folder under /locales/<code>/.
 * `nameEnglish` is for tooling/docs only and is never rendered in the UI.
 */

export type ScriptId =
  | 'latin'
  | 'devanagari'
  | 'bengali'
  | 'gujarati'
  | 'gurmukhi'
  | 'kannada'
  | 'malayalam'
  | 'odia'
  | 'tamil'
  | 'telugu'
  | 'olchiki'
  | 'meiteimayek'
  | 'naskh'
  | 'nastaliq';

export interface Language {
  /** ISO 639-1 where one exists, otherwise ISO 639-3. Used as the locale folder name and the HTML lang attribute. */
  code: string;
  nameNative: string;
  nameEnglish: string;
  script: ScriptId;
  dir: 'ltr' | 'rtl';
  /** Part of the 22 languages of the Eighth Schedule. */
  scheduled: boolean;
  /**
   * BCP 47 tag used ONLY for Intl number/date/plural formatting. Several
   * languages lack ICU data, so this may point at a close, supported locale.
   * It never affects which text is shown.
   */
  formatLocale: string;
}

const lang = <C extends string>(l: Language & { code: C }) => l;

export const LANGUAGES = [
  lang({ code: 'as', nameNative: 'অসমীয়া', nameEnglish: 'Assamese', script: 'bengali', dir: 'ltr', scheduled: true, formatLocale: 'as-IN' }),
  lang({ code: 'bn', nameNative: 'বাংলা', nameEnglish: 'Bengali', script: 'bengali', dir: 'ltr', scheduled: true, formatLocale: 'bn-IN' }),
  lang({ code: 'brx', nameNative: 'बड़ो', nameEnglish: 'Bodo', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'hi-IN' }),
  lang({ code: 'doi', nameNative: 'डोगरी', nameEnglish: 'Dogri', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'hi-IN' }),
  lang({ code: 'en', nameNative: 'English', nameEnglish: 'English', script: 'latin', dir: 'ltr', scheduled: false, formatLocale: 'en-IN' }),
  lang({ code: 'gu', nameNative: 'ગુજરાતી', nameEnglish: 'Gujarati', script: 'gujarati', dir: 'ltr', scheduled: true, formatLocale: 'gu-IN' }),
  lang({ code: 'hi', nameNative: 'हिन्दी', nameEnglish: 'Hindi', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'hi-IN' }),
  lang({ code: 'kn', nameNative: 'ಕನ್ನಡ', nameEnglish: 'Kannada', script: 'kannada', dir: 'ltr', scheduled: true, formatLocale: 'kn-IN' }),
  lang({ code: 'ks', nameNative: 'کٲشُر', nameEnglish: 'Kashmiri', script: 'naskh', dir: 'rtl', scheduled: true, formatLocale: 'ur-IN' }),
  lang({ code: 'kok', nameNative: 'कोंकणी', nameEnglish: 'Konkani', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'kok-IN' }),
  lang({ code: 'mai', nameNative: 'मैथिली', nameEnglish: 'Maithili', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'mai-IN' }),
  lang({ code: 'ml', nameNative: 'മലയാളം', nameEnglish: 'Malayalam', script: 'malayalam', dir: 'ltr', scheduled: true, formatLocale: 'ml-IN' }),
  lang({ code: 'mni', nameNative: 'ꯃꯩꯇꯩꯂꯣꯟ', nameEnglish: 'Manipuri (Meitei)', script: 'meiteimayek', dir: 'ltr', scheduled: true, formatLocale: 'mni' }),
  lang({ code: 'mr', nameNative: 'मराठी', nameEnglish: 'Marathi', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'mr-IN' }),
  lang({ code: 'ne', nameNative: 'नेपाली', nameEnglish: 'Nepali', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'ne-IN' }),
  lang({ code: 'or', nameNative: 'ଓଡ଼ିଆ', nameEnglish: 'Odia', script: 'odia', dir: 'ltr', scheduled: true, formatLocale: 'or-IN' }),
  lang({ code: 'pa', nameNative: 'ਪੰਜਾਬੀ', nameEnglish: 'Punjabi', script: 'gurmukhi', dir: 'ltr', scheduled: true, formatLocale: 'pa-IN' }),
  lang({ code: 'raj', nameNative: 'राजस्थानी', nameEnglish: 'Rajasthani', script: 'devanagari', dir: 'ltr', scheduled: false, formatLocale: 'hi-IN' }),
  lang({ code: 'sa', nameNative: 'संस्कृतम्', nameEnglish: 'Sanskrit', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'sa-IN' }),
  lang({ code: 'sat', nameNative: 'ᱥᱟᱱᱛᱟᱲᱤ', nameEnglish: 'Santali', script: 'olchiki', dir: 'ltr', scheduled: true, formatLocale: 'sat-IN' }),
  lang({ code: 'sd', nameNative: 'سنڌي', nameEnglish: 'Sindhi', script: 'naskh', dir: 'rtl', scheduled: true, formatLocale: 'sd-IN' }),
  lang({ code: 'ta', nameNative: 'தமிழ்', nameEnglish: 'Tamil', script: 'tamil', dir: 'ltr', scheduled: true, formatLocale: 'ta-IN' }),
  lang({ code: 'te', nameNative: 'తెలుగు', nameEnglish: 'Telugu', script: 'telugu', dir: 'ltr', scheduled: true, formatLocale: 'te-IN' }),
  lang({ code: 'ur', nameNative: 'اردو', nameEnglish: 'Urdu', script: 'nastaliq', dir: 'rtl', scheduled: true, formatLocale: 'ur-IN' }),
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const BY_CODE = new Map<string, Language>(LANGUAGES.map((l) => [l.code, l]));

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

export function getLanguage(code: LanguageCode): Language {
  return BY_CODE.get(code)!;
}

/** Internal translation-quality state of a locale. Never shown as UI text. */
export const LOCALE_STATUSES = ['reviewed', 'machine-translated', 'partially-reviewed', 'needs-review'] as const;
export type LocaleStatus = (typeof LOCALE_STATUSES)[number];

/** What a human review covered. A locale is only "reviewed" when ALL scopes are covered. */
export const REVIEW_SCOPES = ['ui', 'scheme-vocabulary', 'safety-strings'] as const;
export type ReviewScope = (typeof REVIEW_SCOPES)[number];

/**
 * Record of a REAL human review. Never fabricate one: the i18n check refuses status "reviewed" or
 * "partially-reviewed" without it, and refuses it on machine/draft statuses.
 */
export interface LocaleReview {
  reviewer: string; // person or organisation, as agreed in the review contract
  method: 'native-speaker' | 'professional-translator';
  reviewedOn: string; // YYYY-MM-DD
  scope: ReviewScope[];
  reference?: string; // ticket / report id
}

export interface LocaleMeta {
  status: LocaleStatus;
  /** Who/what produced the current text, e.g. "human:<name>" or "draft:claude". */
  translator: string;
  updatedOn: string; // YYYY-MM-DD
  notes?: string;
  /** No verified linguistic resources exist (e.g. Rajasthani); needs extra care before any public claim. */
  limitedResource?: boolean;
  /** Order in which native review should happen. */
  reviewPriority?: 'critical' | 'high' | 'normal';
  review?: LocaleReview;
}
