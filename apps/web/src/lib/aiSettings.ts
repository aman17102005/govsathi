/**
 * The citizen's own AI provider settings. GovSathi ships no AI key.
 *
 * Where the key lives: sessionStorage by default (gone when the tab closes); localStorage only if the citizen ticks
 * "remember on this device". Neither is encrypted (a browser cannot protect a secret from scripts on its own origin),
 * which is why the page is served with a strict CSP, renders no untrusted HTML, and the key is never put in a URL,
 * log, error message or analytics event. See docs/privacy-and-trust.md.
 */
export interface AiSettings {
  provider: string;
  model: string;
  apiKey: string;
  remember: boolean;
}

const KEY = 'govsathi.ai.v1';

function read(area: 'session' | 'local'): AiSettings | null {
  try {
    const raw = (area === 'session' ? window.sessionStorage : window.localStorage).getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<AiSettings>;
    if (typeof v.provider === 'string' && typeof v.model === 'string' && typeof v.apiKey === 'string' && v.apiKey) {
      return { provider: v.provider, model: v.model, apiKey: v.apiKey, remember: area === 'local' };
    }
  } catch {
    /* storage unavailable or corrupt: behave as "AI off" */
  }
  return null;
}

type Listener = () => void;
const listeners = new Set<Listener>();
export const onAiSettingsChange = (l: Listener) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const aiSettings = {
  get: (): AiSettings | null => read('session') ?? read('local'),
  set(s: AiSettings): void {
    aiSettings.clear();
    try {
      (s.remember ? window.localStorage : window.sessionStorage).setItem(KEY, JSON.stringify({ provider: s.provider, model: s.model, apiKey: s.apiKey }));
    } catch {
      /* ignore: AI stays off */
    }
    listeners.forEach((l) => l());
  },
  clear(): void {
    for (const area of [() => window.sessionStorage, () => window.localStorage]) {
      try {
        area().removeItem(KEY);
      } catch {
        /* ignore */
      }
    }
    listeners.forEach((l) => l());
  },
};

/** Headers for one request. The key goes in a header only (never the URL or body), over HTTPS. */
export function aiHeaders(s: AiSettings | null, withModel = true): Record<string, string> {
  if (!s) return {};
  return { 'x-ai-provider': s.provider, 'x-ai-key': s.apiKey, ...(withModel ? { 'x-ai-model': s.model } : {}) };
}
