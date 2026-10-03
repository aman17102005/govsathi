import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGES, isCitizenVisible, type DescribeCtx, type Scheme } from '@govsathi/shared';

export interface Corpus {
  /** Records a citizen may see (published/updated/suspended/discontinued). Whether one is RECOMMENDED depends on today's date: see isRecommendable. */
  schemes: Scheme[];
  byId: Map<string, Scheme>;
  /** Vocabulary (cat.*, benefit.*, opt.*, ...) per language, used to index schemes in every language. */
  vocabs: Record<string, Record<string, string>>;
  /** English describe context: used to give the LLM the same facts the UI shows, never to display text. */
  en: DescribeCtx;
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

export function loadCorpus(root: string): Corpus {
  const schemes = walk(path.join(root, 'data/schemes'))
    .map((f) => readJson<Scheme>(f))
    .filter((s): s is Scheme => !!s && isCitizenVisible(s))
    .sort((a, b) => a.id.localeCompare(b.id));
  const vocabs: Record<string, Record<string, string>> = {};
  for (const l of LANGUAGES) {
    const v = readJson<Record<string, string>>(path.join(root, 'locales', l.code, 'vocab.json'));
    if (v) vocabs[l.code] = v;
  }
  const geo = readJson<Record<string, string>>(path.join(root, 'locales/en/geo.json')) ?? {};
  const enMessages: Record<string, string> = { ...(vocabs.en ?? {}), ...geo, ...(readJson<Record<string, string>>(path.join(root, 'locales/en/app.json')) ?? {}) };
  const fill = (tpl: string, params?: Record<string, string | number>) =>
    tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(params?.[k] ?? ''));
  const en: DescribeCtx = {
    t: (key, params) => fill(enMessages[key] ?? key, params),
    money: (n) => `₹${n.toLocaleString('en-IN')}`,
  };
  return { schemes, byId: new Map(schemes.map((s) => [s.id, s])), vocabs, en };
}
