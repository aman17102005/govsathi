import type { Citation, Scheme } from './scheme';

/** Records older than this since `lastVerified` are never shown as current. */
export const MAX_VERIFICATION_AGE_DAYS = 90;
/** "Deadline approaching" window. */
export const DEADLINE_WARNING_DAYS = 30;

/** What a citizen is told about a scheme today. */
export type CurrentState = 'active' | 'deadline_approaching' | 'expired' | 'suspended' | 'discontinued' | 'verification_required';

/** Official-source hosts: Government of India / state domains. Anything else cannot validate a scheme. */
export function isOfficialHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'gov.in' || h.endsWith('.gov.in') || h === 'nic.in' || h.endsWith('.nic.in');
}
/** https only, no credentials, standard port, official host. Parsed by hand so this module needs no DOM/Node URL type. */
export function isOfficialUrl(url: string): boolean {
  const m = /^https:\/\/([^/?#@:\s]+)(?::443)?(?:[/?#]|$)/i.exec(url);
  return !!m && isOfficialHost(m[1]!);
}

const dayMs = 86_400_000;
export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / dayMs);
export const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

const PUBLIC_LIFECYCLES = new Set(['published', 'updated']);
/** Records a citizen may open by link (also to learn that a scheme ended). Records still being verified are never visible. */
const VISIBLE_LIFECYCLES = new Set(['published', 'updated', 'suspended', 'discontinued']);

export const isCitizenVisible = (s: Scheme): boolean => VISIBLE_LIFECYCLES.has(s.lifecycle);

/** The claims every public scheme must have a citation for. */
export function requiredClaims(s: Scheme): string[] {
  const claims = s.benefits.map((_, i) => `benefit:${i}`);
  claims.push(...s.rules.filter((r) => r.hard).map((r) => `rule:${r.id}`));
  if (s.apply.url) claims.push('apply.url');
  return claims;
}

export function missingCitations(s: Scheme): string[] {
  const have = new Set(s.citations.map((c) => c.claim));
  return requiredClaims(s).filter((c) => !have.has(c));
}

export const citationFor = (s: Scheme, claim: string): Citation | undefined => s.citations.find((c) => c.claim === claim);

/** Date-aware state. `today` is YYYY-MM-DD; the current date is always an input, never assumed. */
export function currentState(s: Scheme, today: string): CurrentState {
  if (s.lifecycle === 'discontinued' || s.lifecycle === 'archived') return 'discontinued';
  if (s.lifecycle === 'suspended') return 'suspended';
  if (!PUBLIC_LIFECYCLES.has(s.lifecycle)) return 'verification_required';
  const v = s.validity;
  const ends = [v?.endDate, v?.applicationDeadline].filter((d): d is string => !!d).sort()[0];
  if (ends && ends < today) return 'expired';
  if (daysBetween(s.lastVerified, today) > MAX_VERIFICATION_AGE_DAYS) return 'verification_required';
  if (ends && daysBetween(today, ends) <= DEADLINE_WARNING_DAYS) return 'deadline_approaching';
  return 'active';
}

/**
 * The public-catalogue gate. A scheme may be recommended only when every reason list is empty.
 * This is the automated confidence gate; `verification.level` records whether a person also checked it.
 */
export function publicationBlockers(s: Scheme, today: string): string[] {
  const out: string[] = [];
  if (!PUBLIC_LIFECYCLES.has(s.lifecycle)) out.push(`lifecycle is "${s.lifecycle}"`);
  if (s.hold) out.push(`on hold: ${s.hold.reason}`);
  if (!s.sources.some((x) => isOfficialUrl(x.url))) out.push('no official government source (https, gov.in/nic.in)');
  if (s.verification.level === 'unverified') out.push('verification level is "unverified"');
  if ((s.discrepancies ?? []).some((d) => d.status === 'open')) out.push('open source discrepancy');
  const missing = missingCitations(s);
  if (missing.length > 0) out.push(`uncited claims: ${missing.join(', ')}`);
  for (const c of s.citations) {
    if (c.evidence === 'declared' && c.claim !== 'apply.url') out.push(`citation "${c.claim}" is only declared, not matched against the source text`);
    const src = s.sources[c.src];
    if (!src || !isOfficialUrl(src.url)) out.push(`citation "${c.claim}" does not point at an official source`);
  }
  const state = currentState(s, today);
  if (state === 'expired' || state === 'verification_required' || state === 'discontinued' || state === 'suspended') out.push(`current state is ${state}`);
  return out;
}

/** Eligible to appear in search results and recommendations today. */
export const isRecommendable = (s: Scheme, today: string): boolean => publicationBlockers(s, today).length === 0;
