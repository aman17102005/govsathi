import { describe, expect, it } from 'vitest';
import { deriveFacts } from './facts';

describe('deriveFacts', () => {
  it('derives age from date of birth and marks senior / woman', () => {
    const f = deriveFacts({ version: 1, dateOfBirth: '1960-05-01', gender: 'female' }, new Date('2026-10-03'));
    expect(f.age).toBe(66);
    expect(f.senior).toBe(true);
    expect(f.woman).toBe(true);
  });
  it('derives minority status from religion only when religion is given', () => {
    expect(deriveFacts({ version: 1, religion: 'sikh' }).minority).toBe(true);
    expect(deriveFacts({ version: 1, religion: 'hindu' }).minority).toBe(false);
    expect(deriveFacts({ version: 1 }).minority).toBeUndefined();
  });
  it('rules out pregnancy only outside biologically plausible bounds', () => {
    expect(deriveFacts({ version: 1, ageYears: 62, gender: 'female' }).pregnantOrLactating).toBe(false);
    expect(deriveFacts({ version: 1, ageYears: 30, gender: 'female' }).pregnantOrLactating).toBeUndefined();
    expect(deriveFacts({ version: 1, ageYears: 30, gender: 'female', circumstances: ['pregnant_or_lactating'] }).pregnantOrLactating).toBe(true);
  });
  it('treats "not studying" as an answer so student-only criteria fail', () => {
    expect(deriveFacts({ version: 1, educationStatus: 'not_studying' }).educationLevel).toBe('not_studying');
    expect(deriveFacts({ version: 1, ageYears: 65 }).educationLevel).toBe('not_studying');
    expect(deriveFacts({ version: 1, ageYears: 20 }).educationLevel).toBeUndefined();
    expect(deriveFacts({ version: 1, ageYears: 65, educationStatus: 'college', educationLevel: 'undergraduate' }).educationLevel).toBe('undergraduate');
  });
  it('never sends personal identifiers as facts', () => {
    const f = deriveFacts({ version: 1, name: 'Asha', dateOfBirth: '1990-01-01', district: 'X', state: 'PB' });
    expect(JSON.stringify(f)).not.toMatch(/Asha|1990-01-01|"X"/);
  });
});
