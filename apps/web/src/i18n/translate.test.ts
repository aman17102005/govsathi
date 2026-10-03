import { describe, expect, it } from 'vitest';
import { getLanguage } from '@govsathi/shared';
import { createTranslator, MissingTranslationError } from './translate';

const hi = getLanguage('hi');

describe('createTranslator', () => {
  it('returns the message and formats ICU params', () => {
    const t = createTranslator(hi, { 'app.name': 'नमस्ते {name}' }, { strict: true });
    expect(t('app.name', { name: 'अमन' })).toBe('नमस्ते अमन');
  });
  it('throws on a missing key in strict mode', () => {
    const t = createTranslator(hi, {}, { strict: true });
    expect(() => t('app.name')).toThrow(MissingTranslationError);
  });
  it('never falls back to another language in production mode', () => {
    const t = createTranslator(hi, {}, { strict: false });
    expect(t('app.name')).toBe('');
  });
});
