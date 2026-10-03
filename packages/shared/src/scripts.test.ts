import { describe, expect, it } from 'vitest';
import { isEntirelyScript } from './scripts';

describe('isEntirelyScript', () => {
  it('accepts text in the right script, ignoring digits and punctuation', () => {
    expect(isEntirelyScript('३ अक्टू॰ 2026', 'devanagari')).toBe(true);
    expect(isEntirelyScript('ᱢᱟᱨᱪ', 'olchiki')).toBe(true);
  });
  it('rejects English or another script (e.g. Bengali month names for a Meitei Mayek UI)', () => {
    expect(isEntirelyScript('Oct 3, 2026', 'devanagari')).toBe(false);
    expect(isEntirelyScript('মার্চ', 'meiteimayek')).toBe(false);
    expect(isEntirelyScript('मार्चु', 'naskh')).toBe(false);
  });
  it('rejects text with no letters at all', () => {
    expect(isEntirelyScript('2026-10-03', 'devanagari')).toBe(false);
  });
});
