import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Language } from '@govsathi/shared';
import { checkLocales } from './check';

const langs: Language[] = [
  { code: 'en', nameNative: 'English', nameEnglish: 'English', script: 'latin', dir: 'ltr', scheduled: false, formatLocale: 'en' },
  { code: 'hi', nameNative: 'हिन्दी', nameEnglish: 'Hindi', script: 'devanagari', dir: 'ltr', scheduled: true, formatLocale: 'hi' },
];

function fixture(hi: Record<string, string>, en: Record<string, string> = { a: 'Hello {name}', b: 'Bye' }, hiMeta: object = { status: 'machine-translated', translator: 'draft:test', updatedOn: '2026-01-01' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-'));
  const write = (code: string, msgs: object, meta: object) => {
    fs.mkdirSync(path.join(dir, code));
    fs.writeFileSync(path.join(dir, code, 'common.json'), JSON.stringify(msgs));
    fs.writeFileSync(path.join(dir, code, 'meta.json'), JSON.stringify(meta));
  };
  write('en', en, { status: 'reviewed', translator: 'human:t', updatedOn: '2026-01-01' });
  write('hi', hi, hiMeta);
  return dir;
}
export const kindsOf = (dir: string) => checkLocales({ localesDir: dir, languages: langs, latinAllowlist: [], identicalAllowed: [], neutralKeys: [], files: ['common.json'] }).map((i) => i.kind);

describe('checkLocales', () => {
  it('passes a complete locale', () => {
    expect(kindsOf(fixture({ a: 'नमस्ते {name}', b: 'अलविदा' }))).toEqual([]);
  });
  it('flags missing and extra keys', () => {
    expect(kindsOf(fixture({ a: 'नमस्ते {name}', c: 'x' }))).toEqual(['missing-key', 'extra-key']);
  });
  it('flags untranslated English copies and stray Latin text', () => {
    const k = kindsOf(fixture({ a: 'Hello {name}', b: 'अलविदा Bye' }));
    expect(k).toContain('english-copy');
    expect(k).toContain('stray-latin');
    expect(k).toContain('wrong-script');
  });
  it('flags placeholder mismatches', () => {
    expect(kindsOf(fixture({ a: 'नमस्ते', b: 'अलविदा' }))).toEqual(['placeholder-mismatch']);
  });
  it('flags a missing locale folder', () => {
    const dir = fixture({ a: 'x', b: 'y' });
    fs.rmSync(path.join(dir, 'hi'), { recursive: true });
    expect(kindsOf(dir)).toEqual(['missing-locale']);
  });
});

describe('review governance', () => {
  const ok = { a: 'नमस्ते {name}', b: 'अलविदा' };
  it('refuses "reviewed" without a real review record', () => {
    expect(kindsOf(fixture(ok, undefined, { status: 'reviewed', translator: 'human:x', updatedOn: '2026-01-01' }))).toEqual(['fabricated-review']);
  });
  it('refuses "reviewed" with a draft translator or partial scope', () => {
    const review = { reviewer: 'Org', method: 'native-speaker', reviewedOn: '2026-02-01', scope: ['ui'] };
    expect(kindsOf(fixture(ok, undefined, { status: 'reviewed', translator: 'draft:x', updatedOn: '2026-01-01', review }))).toEqual(['fabricated-review', 'fabricated-review']);
  });
  it('accepts a complete real review', () => {
    const review = { reviewer: 'Org', method: 'native-speaker', reviewedOn: '2026-02-01', scope: ['ui', 'scheme-vocabulary', 'safety-strings'] };
    expect(kindsOf(fixture(ok, undefined, { status: 'reviewed', translator: 'human:Org', updatedOn: '2026-02-01', review }))).toEqual([]);
  });
  it('refuses a review record on a machine-translated locale', () => {
    const review = { reviewer: 'Org', method: 'native-speaker', reviewedOn: '2026-02-01', scope: ['ui'] };
    expect(kindsOf(fixture(ok, undefined, { status: 'machine-translated', translator: 'draft:x', updatedOn: '2026-01-01', review }))).toEqual(['fabricated-review']);
  });
});
