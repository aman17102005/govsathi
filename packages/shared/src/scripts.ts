import type { ScriptId } from './languages';

/** Unicode ranges per script, used to verify that text really is in the script a locale claims. */
export const SCRIPT_RANGES: Record<ScriptId, RegExp> = {
  latin: /[A-Za-z]/,
  devanagari: /[ऀ-ॿ]/,
  bengali: /[ঀ-৿]/,
  gurmukhi: /[਀-੿]/,
  gujarati: /[઀-૿]/,
  odia: /[଀-୿]/,
  tamil: /[஀-௿]/,
  telugu: /[ఀ-౿]/,
  kannada: /[ಀ-೿]/,
  malayalam: /[ഀ-ൿ]/,
  olchiki: /[᱐-᱿]/,
  meiteimayek: /[ꯀ-꯿ꫠ-꫿]/,
  naskh: /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/,
  nastaliq: /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/,
};

const LETTER = /\p{L}/u;

/**
 * True when every letter in `text` belongs to `script` (digits/punctuation are ignored).
 * Used to reject browser-supplied month/date names that would otherwise appear in a different script
 * or in English for locales the browser has no data for.
 */
export function isEntirelyScript(text: string, script: ScriptId): boolean {
  const re = SCRIPT_RANGES[script];
  const letters = [...text].filter((c) => LETTER.test(c));
  return letters.length > 0 && letters.every((c) => re.test(c));
}
