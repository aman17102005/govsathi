/**
 * Claim-level evidence: for each claim in a scheme record, look for supporting text in the fetched official sources.
 * This is keyword/number matching, NOT understanding: it proves "the official page mentions this", records the sentence,
 * and lets a reviewer check it in seconds. A claim with no match gets no citation and keeps the scheme out of the catalogue.
 */
import type { AllOf, Benefit, Citation, DocumentId, EligibilityRule, Scheme, SimpleRule } from '@govsathi/shared';
import type { Snapshot } from './store';

const isAll = (x: SimpleRule | AllOf): x is AllOf => 'all' in x;

/** "Rs. 60,000" must not be split into two sentences. */
const abbrevSafe = (t: string): string => t.replace(/\b(Rs|No|Sh|Smt|Dr|Mr|Mrs|St)\.\s*/g, '$1 ');

export const sentences = (text: string): string[] =>
  abbrevSafe(text).split(/(?<=[.!?])\s+|\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 3 && s.length < 700);

export function amountVariants(n: number): RegExp {
  const forms = new Set<string>([String(n), n.toLocaleString('en-IN'), n.toLocaleString('en-US')]);
  if (n >= 100000 && n % 10000 === 0) {
    const lakh = n / 100000;
    forms.add(`${lakh} lakh`);
    forms.add(`${lakh.toFixed(2)} lakh`);
  }
  if (n >= 10000000) forms.add(`${n / 10000000} crore`);
  return new RegExp(`(?<![\\d,.])(?:${[...forms].map((f) => f.replace(/[.,]/g, '\\$&')).join('|')})(?![\\d])`, 'i');
}

const AGE_WORD = /\b(age|aged|years?|yrs?|old)\b/i;
const num = (n: number) => new RegExp(`(?<![\\d.,])${n}(?![\\d])`);

/** Stronger than a bare keyword: the sentence must actually describe this kind of benefit. */
const BENEFIT_WORDS: Record<Benefit['type'], RegExp> = {
  cash: /(financial assistance|cash assistance|assistance of|cash (incentive|transfer|benefit|grant)|incentive of|direct benefit|amount of)/i,
  insurance_cover: /(insurance cover|life cover|risk cover|accidental|insured|sum assured)/i,
  pension: /pension.*(per month|monthly|₹|rs\b)|(per month|monthly|₹|rs\b).*pension/i,
  loan: /\bloans?\b.*(₹|rs\b|lakh|upto|up to|collateral)|(₹|rs\b|lakh|upto|up to|collateral).*\bloans?\b/i,
  subsidy: /subsid/i,
  scholarship: /(scholarship|stipend)/i,
  health_cover: /(health (cover|insurance|protection|coverage)|cashless (treatment|hospitali))/i,
  training: /(skill training|training (programme|program|course|of)|upskill)/i,
  stipend: /(stipend|allowance)/i,
  goods: /(free (of cost )?(lpg|gas|stove|refill|connection|scooty|cycle|bicycle|kit|toolkit)|stove|scooty|toolkit)/i,
  employment: /(wage employment|days of (unskilled )?(manual )?work|guarantee[ds]? .*employment|employment .*guarantee)/i,
  other: /./,
};

/** An amount that is only mentioned as the OLD figure ("from the earlier ₹5 lakh", "(from ₹10,000)") is not evidence for it. */
const STALE_BEFORE = /\b(from|earlier|previous(?:ly)?|old|erstwhile|formerly|was|were|instead of)\W{0,4}(?:\w+\W+){0,2}$/i;
export function currentAmountMention(re: RegExp, sentence: string): boolean {
  const g = new RegExp(re.source, 'gi');
  for (let m = g.exec(sentence); m; m = g.exec(sentence)) {
    const before = sentence.slice(Math.max(0, m.index - 28), m.index).replace(/[₹]|rs\.?|inr/gi, '');
    if (!STALE_BEFORE.test(before)) return true;
  }
  return false;
}

const DOC_WORDS: Record<DocumentId, RegExp> = {
  aadhaar: /aadhaar|aadhar/i,
  bank_account_details: /bank/i,
  income_certificate: /income (certificate|proof)|certificate of income/i,
  caste_certificate: /caste/i,
  residence_proof: /(residen|domicile|address proof|proof of address|permanent address)/i,
  age_proof: /(age proof|proof of age|date of birth|birth certificate|\bdob\b)/i,
  land_records: /(land|khasra|khatauni|jamabandi|record of rights|holding)/i,
  ration_card: /ration/i,
  photograph: /photo/i,
  disability_certificate: /(disab|udid|divyang)/i,
  education_certificates: /(marksheet|mark sheet|certificate|admission|enrol|fee receipt|result|school|college)/i,
  mobile_number: /mobile/i,
  birth_certificate: /birth/i,
  pregnancy_records: /(pregnan|mother and child|mcp|rch)/i,
  project_report: /project report/i,
  id_proof: /(id proof|identity|voter|pan card|driving licen)/i,
  self_declaration: /(self[- ]declaration|affidavit|undertaking)/i,
  job_card: /job card/i,
  vending_certificate: /(vending|letter of recommendation|\blor\b)/i,
  marriage_certificate: /marriage/i,
  death_certificate: /death/i,
  bpl_card: /\bbpl\b|below poverty/i,
  domicile_certificate: /domicile/i,
  worker_registration: /(registration|registered|labour|worker)/i,
  jan_aadhaar: /jan[- ]?aadhaar/i,
};

type Matcher = (s: string) => boolean;
const any = (...res: RegExp[]): Matcher => (s) => res.some((r) => r.test(s));
const both = (a: RegExp, b: RegExp): Matcher => (s) => a.test(s) && b.test(s);

const OCC: Record<string, RegExp> = {
  street_vendor: /(vendor|hawker)/i,
  artisan: /(artisan|craft|traditional)/i,
  business_owner: /(business|enterprise|entrepreneur|micro)/i,
  construction_worker: /(construction|building|worker)/i,
  govt_employee: /(government (employee|servant)|serving|retired|pensioner|public sector)/i,
};
const EDU: Record<string, RegExp> = {
  class_9_10: /(\b(9|10|IX|X)(th)?\b|class|secondary|matric)/i,
  class_11_12: /(\b(11|12|XI|XII)(th)?\b|senior secondary|higher secondary|post[- ]matric|\+2|plus two)/i,
  diploma_iti: /(diploma|\biti\b|polytechnic)/i,
  undergraduate: /(graduat|degree|\bug\b|college|bachelor)/i,
  postgraduate: /(post[- ]?graduat|master|\bpg\b)/i,
  doctorate: /(doctorate|ph\.?d|research)/i,
};
const HOUSING: RegExp = /(house|kutcha|pucca|dwelling|shelter|home|roof)/i;

export function ruleMatchers(r: SimpleRule): Matcher[] | null {
  const v = r.value;
  const arr = Array.isArray(v) ? (v as (string | number)[]) : [v as string | number];
  switch (r.fact) {
    case 'age':
      if (r.op === 'between') return [(s) => AGE_WORD.test(s) && num((v as number[])[0]!).test(s) && num((v as number[])[1]!).test(s)];
      {
        const n = v as number;
        const alt = r.op === 'lte' ? n + 1 : n - 1; // "more than 55" means >= 56; "below 58" means <= 57
        return [(s) => AGE_WORD.test(s) && (num(n).test(s) || num(alt).test(s))];
      }
    case 'gender':
      return [v === 'female' ? any(/\b(women|woman|female|girl|girls|daughter|widow|mother|lady)\b/i) : any(/\b(male|men|man|boy|boys)\b/i)];
    case 'area':
      return [any(v === 'rural' ? /\b(rural|village|gram|panchayat)\b/i : /\b(urban|city|cities|town|municipal)\b/i)];
    case 'bpl':
      return [any(/\bBPL\b/, /poverty/i, /\bpoor\b/i, /economically weaker/i, /\bEWS\b/)];
    case 'category':
      return [any(...arr.map((c) => (c === 'sc' ? /(scheduled caste|\bSCs?\b)/ : c === 'st' ? /(scheduled tribe|\bSTs?\b)/ : c === 'obc' ? /(\bOBC\b|backward)/i : /\b(general|minority)\b/i)))];
    case 'disability':
      return [any(/(disab|divyang|handicap|specially[- ]abled|impair)/i)];
    case 'disabilityPercent':
      return [(s) => /(disab|divyang|impair)/i.test(s) && (num(v as number).test(s) || num((v as number) - 1).test(s))];
    case 'educationLevel':
      return [any(...arr.map((e) => EDU[String(e)] ?? /./))];
    case 'familyIncome':
    case 'personalIncome':
      return [(s) => /income/i.test(s) && currentAmountMention(amountVariants(v as number), s)];
    case 'farmer':
      return [any(/(farmer|agricultur|cultivat|kisan)/i)];
    case 'landOwner':
      return [any(/(land|holding|cultivable|khasra|khatauni)/i)];
    case 'hasBankAccount':
      return [any(/(bank|savings account|account)/i)];
    case 'hasLpg':
      return [any(/(lpg|gas connection|cooking gas)/i)];
    case 'incomeTaxPayer':
      return [any(/(income[- ]tax|taxpayer|tax payer)/i)];
    case 'hasDaughterUnder10':
      return [any(/(daughter|girl child|girl)/i)];
    case 'housing':
      return [any(HOUSING)];
    case 'maritalStatus':
      return [any(...arr.map((m) => (m === 'single' ? /(unmarried|single|spinster)/i : /(widow|divorc|deserted|separated|destitute)/i)))];
    case 'occupation':
      return [any(...arr.map((o) => OCC[String(o)] ?? /./))];
    case 'pregnantOrLactating':
      return [any(/(pregnan|lactat|nursing)/i)];
    case 'wantsBusiness':
      return [any(/(business|enterprise|self[- ]employ|project|venture)/i)];
    case 'state':
      return null; // state applicability is stated by the record's stateCodes; not text-matched
    default:
      return null;
  }
}

export interface Hit {
  src: number;
  quote: string;
  readOn: string;
}

function firstHit(snaps: Snapshot[], test: Matcher): Hit | undefined {
  for (const snap of snaps) {
    const hit = sentences(snap.text).find(test);
    if (hit) return { src: snap.src, quote: hit.slice(0, 240), readOn: snap.retrievedAt.slice(0, 10) };
  }
  return undefined;
}

export function benefitEvidence(b: Benefit, snaps: Snapshot[]): Hit | undefined {
  if (b.amount !== undefined) {
    const re = amountVariants(b.amount);
    return firstHit(snaps, (s) => currentAmountMention(re, s));
  }
  return firstHit(snaps, (s) => BENEFIT_WORDS[b.type].test(s) && s.length > 40);
}

export function ruleEvidence(r: EligibilityRule, snaps: Snapshot[]): Hit | undefined {
  const simple: SimpleRule[] = r.rule ? [r.rule] : [];
  const groups: SimpleRule[][] = r.anyOf ? r.anyOf.map((a) => (isAll(a) ? a.all : [a])) : [];
  const tryRules = (rules: SimpleRule[]): Hit | undefined => {
    const ms = rules.map(ruleMatchers);
    if (ms.some((m) => m === null)) return undefined;
    const first = rules[0]!;
    const matchers = ms[0]!;
    if (rules.length === 1) return firstHit(snaps, matchers[0]!);
    // AND-group: every part must be supported somewhere in the same source
    const hits = rules.map((x) => firstHit(snaps, ruleMatchers(x)![0]!));
    void first;
    return hits.every(Boolean) ? hits[0] : undefined;
  };
  if (simple.length > 0) return tryRules(simple);
  for (const g of groups) {
    const h = tryRules(g);
    if (h) return h;
  }
  return undefined;
}

export function documentEvidence(id: DocumentId, snaps: Snapshot[]): Hit | undefined {
  return firstHit(snaps, (s) => DOC_WORDS[id].test(s));
}

/** Build citations for every claim that has supporting text. Existing manual/declared citations are kept. */
export function buildCitations(s: Scheme, snaps: Snapshot[]): { citations: Citation[]; uncited: string[] } {
  const out: Citation[] = s.citations.filter((c) => c.evidence !== 'text-match');
  const uncited: string[] = [];
  const add = (claim: string, hit: Hit | undefined) => {
    if (out.some((c) => c.claim === claim)) return;
    if (hit) out.push({ claim, src: hit.src, evidence: 'text-match', quote: hit.quote, readOn: hit.readOn });
    else uncited.push(claim);
  };
  s.benefits.forEach((b, i) => add(`benefit:${i}`, benefitEvidence(b, snaps)));
  for (const r of s.rules) add(`rule:${r.id}`, ruleEvidence(r, snaps));
  for (const d of s.documents) add(`document:${d}`, documentEvidence(d, snaps));
  if (s.apply.url) {
    const host = new URL(s.apply.url).hostname.replace(/^www\./, '');
    const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
    const own = snaps.find((x) => hostOf(x.finalUrl) === host);
    const mention = snaps.map((x) => ({ x, line: sentences(x.text).find((l) => l.toLowerCase().includes(host)) })).find((m) => m.line);
    if (own) add('apply.url', { src: own.src, quote: (own.title ?? own.finalUrl).slice(0, 240), readOn: own.retrievedAt.slice(0, 10) });
    else if (mention) add('apply.url', { src: mention.x.src, quote: mention.line!.slice(0, 240), readOn: mention.x.retrievedAt.slice(0, 10) });
    else uncited.push('apply.url');
  }
  return { citations: out, uncited };
}
