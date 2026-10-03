import { describe, expect, it } from 'vitest';
import { currentState, isOfficialUrl, publicationBlockers, type Scheme } from './index';

const base = (over: Partial<Scheme> = {}): Scheme => ({
  id: 'x', level: 'central', stateCodes: [], names: { en: 'X' }, department: 'D', categories: ['finance'],
  benefits: [{ type: 'pension' }], rules: [{ id: 'a', hard: true, rule: { fact: 'age', op: 'gte', value: 60 } }], additionalConditions: false,
  documents: [], apply: { channels: [], steps: [] }, sources: [{ title: 't', url: 'https://x.gov.in/', publisher: 'p', accessed: '2026-10-01' }],
  lastVerified: '2026-10-01', dataVersion: 1, updatedOn: '2026-10-01', lifecycle: 'published',
  verification: { level: 'automated', by: 't', on: '2026-10-01', method: 'm' }, history: [],
  citations: [{ claim: 'benefit:0', src: 0, evidence: 'text-match', readOn: '2026-10-01' }, { claim: 'rule:a', src: 0, evidence: 'text-match', readOn: '2026-10-01' }], keywords: [], ...over,
});
const today = '2026-10-10';

describe('currentState', () => {
  it('active by default', () => expect(currentState(base(), today)).toBe('active'));
  it('expired after endDate or deadline, approaching within 30 days', () => {
    expect(currentState(base({ validity: { endDate: '2026-10-09' } }), today)).toBe('expired');
    expect(currentState(base({ validity: { applicationDeadline: '2026-10-09' } }), today)).toBe('expired');
    expect(currentState(base({ validity: { endDate: '2026-10-25' } }), today)).toBe('deadline_approaching');
    expect(currentState(base({ validity: { endDate: '2027-03-31' } }), today)).toBe('active');
  });
  it('lifecycle drives discontinued / suspended / verification_required', () => {
    expect(currentState(base({ lifecycle: 'discontinued' }), today)).toBe('discontinued');
    expect(currentState(base({ lifecycle: 'archived' }), today)).toBe('discontinued');
    expect(currentState(base({ lifecycle: 'suspended' }), today)).toBe('suspended');
    expect(currentState(base({ lifecycle: 'pending-verification' }), today)).toBe('verification_required');
    expect(currentState(base({ lifecycle: 'discovered' }), today)).toBe('verification_required');
  });
  it('a record not re-verified for >90 days stops being current (the date is always an input)', () => {
    expect(currentState(base(), '2027-01-01')).toBe('verification_required');
  });
});

describe('publication gate', () => {
  it('passes a fully cited, official, current record', () => expect(publicationBlockers(base(), today)).toEqual([]));
  it.each([
    ['non-official source', base({ sources: [{ title: 't', url: 'https://blog.example.com/', publisher: 'p', accessed: '2026-10-01' }] }), 'official'],
    ['open discrepancy', base({ discrepancies: [{ field: 'f', values: [{ src: 0, value: 'a' }, { src: 0, value: 'b' }], used: 0, resolution: 'r', status: 'open', foundOn: '2026-10-01' }] }), 'discrepancy'],
    ['missing citation', base({ citations: [] }), 'uncited'],
    ['unverified', base({ verification: { level: 'unverified', by: '', on: '2026-10-01', method: '' } }), 'unverified'],
    ['not published', base({ lifecycle: 'verified' }), 'lifecycle'],
    ['expired', base({ validity: { endDate: '2026-01-01' } }), 'expired'],
  ])('blocks: %s', (_n, s, word) => {
    expect(publicationBlockers(s, today).join(' ')).toContain(word);
  });
  it('only https gov.in / nic.in count as official', () => {
    expect(isOfficialUrl('https://www.pmuy.gov.in/x')).toBe(true);
    expect(isOfficialUrl('http://www.pmuy.gov.in/x')).toBe(false);
    expect(isOfficialUrl('https://gov.in.evil.com/')).toBe(false);
    expect(isOfficialUrl('https://myscheme.com/')).toBe(false);
    expect(isOfficialUrl('https://user:pw@www.pmuy.gov.in/')).toBe(false);
    expect(isOfficialUrl('https://www.pmuy.gov.in:8443/')).toBe(false);
    expect(isOfficialUrl('https://evil.com/?x=https://a.gov.in/')).toBe(false);
    expect(isOfficialUrl('https://www.pmuy.gov.in')).toBe(true);
  });
});
