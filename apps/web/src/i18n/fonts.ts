import type { Language, ScriptId } from '@govsathi/shared';

/** Font stack per script. Latin ("GovSathi", digits) is always the last fallback. */
export const FONT_STACK: Record<ScriptId, string> = {
  latin: "'Noto Sans'",
  devanagari: "'Noto Sans Devanagari', 'Noto Sans'",
  bengali: "'Noto Sans Bengali', 'Noto Sans'",
  gujarati: "'Noto Sans Gujarati', 'Noto Sans'",
  gurmukhi: "'Noto Sans Gurmukhi', 'Noto Sans'",
  kannada: "'Noto Sans Kannada', 'Noto Sans'",
  malayalam: "'Noto Sans Malayalam', 'Noto Sans'",
  odia: "'Noto Sans Oriya', 'Noto Sans'",
  tamil: "'Noto Sans Tamil', 'Noto Sans'",
  telugu: "'Noto Sans Telugu', 'Noto Sans'",
  olchiki: "'Noto Sans Ol Chiki', 'Noto Sans'",
  meiteimayek: "'Noto Sans Meetei Mayek', 'Noto Sans'",
  naskh: "'Noto Naskh Arabic', 'Noto Sans'",
  nastaliq: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Noto Sans'",
};

// Fontsource ships unicode-range subsets, so the browser only downloads the glyph files it actually needs.
const loaders: Record<ScriptId, () => Promise<unknown>> = {
  latin: () => Promise.all([import('@fontsource/noto-sans/400.css'), import('@fontsource/noto-sans/700.css')]),
  devanagari: () => Promise.all([import('@fontsource/noto-sans-devanagari/400.css'), import('@fontsource/noto-sans-devanagari/700.css')]),
  bengali: () => Promise.all([import('@fontsource/noto-sans-bengali/400.css'), import('@fontsource/noto-sans-bengali/700.css')]),
  gujarati: () => Promise.all([import('@fontsource/noto-sans-gujarati/400.css'), import('@fontsource/noto-sans-gujarati/700.css')]),
  gurmukhi: () => Promise.all([import('@fontsource/noto-sans-gurmukhi/400.css'), import('@fontsource/noto-sans-gurmukhi/700.css')]),
  kannada: () => Promise.all([import('@fontsource/noto-sans-kannada/400.css'), import('@fontsource/noto-sans-kannada/700.css')]),
  malayalam: () => Promise.all([import('@fontsource/noto-sans-malayalam/400.css'), import('@fontsource/noto-sans-malayalam/700.css')]),
  odia: () => Promise.all([import('@fontsource/noto-sans-oriya/400.css'), import('@fontsource/noto-sans-oriya/700.css')]),
  tamil: () => Promise.all([import('@fontsource/noto-sans-tamil/400.css'), import('@fontsource/noto-sans-tamil/700.css')]),
  telugu: () => Promise.all([import('@fontsource/noto-sans-telugu/400.css'), import('@fontsource/noto-sans-telugu/700.css')]),
  olchiki: () => Promise.all([import('@fontsource/noto-sans-ol-chiki/400.css'), import('@fontsource/noto-sans-ol-chiki/700.css')]),
  meiteimayek: () => Promise.all([import('@fontsource/noto-sans-meetei-mayek/400.css'), import('@fontsource/noto-sans-meetei-mayek/700.css')]),
  naskh: () => Promise.all([import('@fontsource/noto-naskh-arabic/400.css'), import('@fontsource/noto-naskh-arabic/700.css')]),
  nastaliq: () => Promise.all([import('@fontsource/noto-nastaliq-urdu/400.css'), import('@fontsource/noto-nastaliq-urdu/700.css')]),
};

const requested = new Map<ScriptId, Promise<unknown>>();
export function loadScriptFont(script: ScriptId): Promise<unknown> {
  let p = requested.get(script);
  if (!p) {
    p = loaders[script]().catch(() => undefined); // missing font must not block the UI
    requested.set(script, p);
  }
  return p;
}

export const loadLanguageFont = (l: Language) => Promise.all([loadScriptFont('latin'), loadScriptFont(l.script)]);
export const loadAllScriptFonts = () => Promise.all((Object.keys(loaders) as ScriptId[]).map(loadScriptFont));
