import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSchemesFromDisk } from '../../../tools/load-schemes';
import { buildIndex, cosine, fuseRankings, words, ngrams } from './index';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const schemes = loadSchemesFromDisk(root);
const vocab = (lang: string) => {
  const dir = path.join(root, 'locales', lang);
  const out: Record<string, string> = {};
  if (!fs.existsSync(path.join(dir, 'vocab.json'))) return out;
  return JSON.parse(fs.readFileSync(path.join(dir, 'vocab.json'), 'utf8')) as Record<string, string>;
};
const index = buildIndex(schemes, [vocab('en')]);
const top = (q: string, n = 4) => index.search(q, n).map((h) => h.schemeId);

describe('tokenization', () => {
  it('normalizes Roman spelling variants', () => {
    expect(words('Kisaan KISAN kissan')).toEqual(['kisan', 'kisan', 'kisan']);
  });
  it('produces trigrams with word boundaries', () => {
    expect(ngrams('kisan')).toEqual(['_ki', 'kis', 'isa', 'san', 'an_']);
  });
});

describe('retrieval', () => {
  it('finds education schemes for an English query', () => {
    expect(top('I need financial help for my education', 6).some((id) => id === 'pb-post-matric-sc' || id === 'pb-mai-bhago-vidya' || id === 'rj-hamari-betiyan')).toBe(true);
  });
  it('finds farmer schemes for a Hinglish query', () => {
    const ids = top('mujhe kisan ke liye yojana chahiye', 6);
    expect(ids).toContain('cen-pm-kisan');
  });
  it('finds farmer schemes for a Hindi-script query with inflection', () => {
    expect(top('किसानों के लिए कोई योजना', 8)).toContain('cen-pm-kisan');
  });
  it('finds housing schemes for a Punjabi query', () => {
    const ids = top('ਮੈਨੂੰ ਘਰ ਬਣਾਉਣ ਲਈ ਸਰਕਾਰੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ', 6);
    expect(ids.some((id) => id.startsWith('cen-pmay'))).toBe(true);
  });
  it('finds girl-child schemes for a Hinglish query', () => {
    const ids = top('meri beti ke liye koi government scheme hai', 8);
    expect(ids.some((id) => ['pb-bebe-nanki', 'pb-mai-bhago-vidya', 'rj-hamari-betiyan', 'pb-ashirwad'].includes(id))).toBe(true);
  });
  it('treats generic request words as noise: "financial help for education" is about education', () => {
    const ids = top('I need financial help for my education', 4);
    const byId = new Map(schemes.map((x) => [x.id, x]));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => byId.get(id)!.categories.includes('education'))).toBe(true);
  });
  it('returns nothing for gibberish', () => {
    expect(top('zzqx vvkk')).toEqual([]);
  });
});

describe('fusion helpers', () => {
  it('fuses rankings by reciprocal rank', () => {
    const f = fuseRankings([['a', 'b'], ['b', 'a']]);
    expect(f.get('a')).toBeCloseTo(f.get('b')!);
  });
  it('cosine similarity', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
