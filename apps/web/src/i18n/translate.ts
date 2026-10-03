import { IntlMessageFormat } from 'intl-messageformat';
import type { Language } from '@govsathi/shared';
import type common from '../../../../locales/en/common.json';
import type app from '../../../../locales/en/app.json';
import type vocab from '../../../../locales/en/vocab.json';
import type geo from '../../../../locales/en/geo.json';

/** Keys known at compile time (from the English reference locale). */
export type MessageKey = keyof typeof common | keyof typeof app | keyof typeof vocab | keyof typeof geo;
export type Messages = Record<string, string>;
export type Params = Record<string, string | number>;
export type TFunction = (key: MessageKey, params?: Params) => string;
/** For keys built from data (e.g. `cat.${id}`). Same behaviour; a missing key still throws in development. */
export type DynamicT = (key: string, params?: Params) => string;

export class MissingTranslationError extends Error {
  constructor(public readonly locale: string, public readonly key: string) {
    super(`Missing translation for "${key}" in locale "${locale}"`);
    this.name = 'MissingTranslationError';
  }
}

interface Options {
  /** Throw on a missing key (development). Otherwise log and render nothing; NEVER fall back to English. */
  strict: boolean;
}

export function createTranslator(language: Language, messages: Messages, { strict }: Options): TFunction & DynamicT {
  const cache = new Map<string, IntlMessageFormat>();
  return (key: string, params?: Params) => {
    const raw = messages[key];
    if (raw === undefined) {
      const err = new MissingTranslationError(language.code, key);
      if (strict) throw err;
      console.error(err.message);
      return '';
    }
    if (!params) return raw;
    let fmt = cache.get(key);
    if (!fmt) {
      fmt = new IntlMessageFormat(raw, language.formatLocale);
      cache.set(key, fmt);
    }
    return String(fmt.format(params));
  };
}
