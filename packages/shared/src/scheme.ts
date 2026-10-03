import type { StateCode } from './geo';
import type { FactName } from './facts';

export const SCHEME_CATEGORIES = [
  'education', 'agriculture', 'healthcare', 'housing', 'women', 'children', 'senior_citizens', 'disability',
  'employment', 'entrepreneurship', 'finance', 'pension', 'insurance', 'skill_development', 'social_welfare', 'other',
] as const;
export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export const BENEFIT_TYPES = [
  'cash', 'insurance_cover', 'pension', 'loan', 'subsidy', 'scholarship', 'health_cover', 'training', 'stipend', 'goods', 'employment', 'other',
] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];
export const BENEFIT_PERIODS = ['once', 'day', 'month', 'year'] as const;
export type BenefitPeriod = (typeof BENEFIT_PERIODS)[number];

/** Structured benefit; rendered from localized templates. Amounts are only present when an official source states them. */
export interface Benefit {
  type: BenefitType;
  amount?: number; // INR
  period?: BenefitPeriod;
  /** True when the official amount is a ceiling or varies (rendered as "up to"). */
  upTo?: boolean;
}

export const DOCUMENTS = [
  'aadhaar', 'bank_account_details', 'income_certificate', 'caste_certificate', 'residence_proof', 'age_proof',
  'land_records', 'ration_card', 'photograph', 'disability_certificate', 'education_certificates', 'mobile_number',
  'birth_certificate', 'pregnancy_records', 'project_report', 'id_proof', 'self_declaration', 'job_card',
  'vending_certificate', 'marriage_certificate', 'death_certificate', 'bpl_card', 'domicile_certificate', 'worker_registration', 'jan_aadhaar',
] as const;
export type DocumentId = (typeof DOCUMENTS)[number];

export const CHANNELS = ['online_portal', 'csc', 'sewa_kendra', 'emitra', 'bank_branch', 'post_office', 'gas_distributor', 'gram_panchayat', 'district_office', 'anganwadi', 'school', 'training_centre'] as const;
export type ChannelId = (typeof CHANNELS)[number];

export const STEPS = [
  'visit_portal', 'register_login', 'enter_details', 'fill_form', 'upload_documents', 'submit_form',
  'visit_office', 'collect_acknowledgement', 'track_status', 'follow_official_steps',
] as const;
export type StepId = (typeof STEPS)[number];

export type RuleOp = 'eq' | 'in' | 'not_in' | 'gte' | 'lte' | 'between' | 'is';
export type RuleValue = string | number | boolean | readonly (string | number)[];

export interface SimpleRule {
  fact: FactName;
  op: RuleOp;
  /** eq/in/not_in: string(s); gte/lte: number; between: [min, max]; is: boolean. */
  value: RuleValue;
}

/**
 * One eligibility criterion taken from an official source.
 * `hard`: a mismatch means the criterion is not met (otherwise it is advisory).
 * `anyOf`: the criterion is met if ANY alternative is met.
 */
export interface AllOf {
  all: SimpleRule[];
}

export interface EligibilityRule {
  id: string;
  hard: boolean;
  rule?: SimpleRule;
  /** Alternatives; each is a single rule or an AND-group. */
  anyOf?: (SimpleRule | AllOf)[];
}

export interface SchemeSource {
  title: string;
  url: string;
  publisher: string;
  /** Date this source was read, YYYY-MM-DD. */
  accessed: string;
}

/** One value of a disputed claim, with the source it came from. */
export interface DiscrepancyValue {
  src: number; // index into Scheme.sources
  value: string;
}

/**
 * Two sources disagree on a claim. Never merged silently: the record keeps every value, which one the record uses,
 * and why. `open` = not yet confirmed by a human; the UI warns citizens and the readiness report lists it.
 */
export interface Discrepancy {
  field: string; // e.g. "benefits[0].amount"
  values: DiscrepancyValue[];
  /** Index into Scheme.sources whose value the record uses. Omitted = no value is used (the claim is withheld). */
  used?: number;
  resolution: string; // why (e.g. "implementing ministry is authoritative")
  status: 'open' | 'resolved';
  foundOn: string; // YYYY-MM-DD
}

export const LIFECYCLE_STATUSES = [
  'discovered', 'pending-verification', 'verified', 'published', 'updated', 'suspended', 'discontinued', 'archived',
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

/** All dates YYYY-MM-DD, as stated by an official source. */
export interface Validity {
  startDate?: string;
  /** Last day the scheme itself runs. */
  endDate?: string;
  applicationDeadline?: string;
  /** e.g. "2025-26" */
  financialYear?: string;
  /** Date of the official notification/amendment this record reflects. */
  effectiveFrom?: string;
  /** True when the official source states no end date (so none is modelled). */
  openEnded?: boolean;
  /** Which source states these dates (index into sources). */
  src?: number;
}

export interface Verification {
  /** `unverified`: nothing checked. `automated`: claims matched against fetched official text by software. `human`: a named person checked the sources. */
  level: 'unverified' | 'automated' | 'human';
  by: string;
  on: string; // YYYY-MM-DD
  method: string;
  notes?: string;
}

export interface HistoryEntry {
  version: number;
  date: string;
  lifecycle: LifecycleStatus;
  change: string;
  by: string;
  sourceUrl?: string;
}

/**
 * A claim and where it comes from. `claim` is a path: `benefit:<index>`, `rule:<id>`, `document:<id>`, `step:<id>`,
 * `channel:<id>`, `apply.url`, `validity`, `department`, `name`.
 */
export interface Citation {
  claim: string;
  src: number; // index into Scheme.sources
  /** How the support was established. */
  evidence: 'text-match' | 'manual' | 'declared';
  /** Short excerpt of the official text that supports the claim (<= 240 chars), so a reviewer can check it quickly. */
  quote?: string;
  /** Date the supporting text was read. */
  readOn: string;
}

export type SchemeLevel = 'central' | 'state';

export interface Scheme {
  id: string;
  level: SchemeLevel;
  /** Empty = applies nationwide (central). */
  stateCodes: StateCode[];
  names: { en: string; hi?: string };
  /** Official ministry/department name as published (proper noun; shown as published). */
  department: string;
  categories: SchemeCategory[];
  benefits: Benefit[];
  rules: EligibilityRule[];
  /** True when the official source lists conditions we do not model; the UI then points to the official source. */
  additionalConditions: boolean;
  documents: DocumentId[];
  apply: { channels: ChannelId[]; steps: StepId[]; url?: string };
  sources: SchemeSource[];
  lastVerified: string;
  /** Monotonic record version, bumped whenever any fact in this record changes. */
  dataVersion: number;
  /** Date this record's content last changed, YYYY-MM-DD. */
  updatedOn: string;
  /** Source disagreements found while building the record. */
  discrepancies?: Discrepancy[];
  /** Position in the publishing pipeline. Only `published`/`updated` records can reach citizens (see catalogue.ts). */
  lifecycle: LifecycleStatus;
  /** Explicit dates that decide whether the scheme is open today. Omit a field only if the official source states none. */
  validity?: Validity;
  /** Who/what verified this record and how. */
  verification: Verification;
  /** Audit trail: one entry per version, newest last. */
  history: HistoryEntry[];
  /** A maintainer's audit found a problem; the scheme is kept out of the catalogue until a person clears the hold. */
  hold?: { reason: string; since: string };
  /** Claim-level citations. Each important claim points at the source it was read from, with the supporting text. */
  citations: Citation[];
  /** English search keywords (supplementary to localized vocabulary). */
  keywords: string[];
}
