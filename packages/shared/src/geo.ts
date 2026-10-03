/**
 * All 28 States and 8 Union Territories (as of 2026). Codes are stable internal identifiers
 * (ISO 3166-2:IN style), NOT LGD codes. Display names live in locales/<lang>/app.json as `state.<code>`.
 */
export const STATES = [
  { code: 'AN', kind: 'ut' }, { code: 'AP', kind: 'state' }, { code: 'AR', kind: 'state' }, { code: 'AS', kind: 'state' },
  { code: 'BR', kind: 'state' }, { code: 'CH', kind: 'ut' }, { code: 'CG', kind: 'state' }, { code: 'DH', kind: 'ut' },
  { code: 'DL', kind: 'ut' }, { code: 'GA', kind: 'state' }, { code: 'GJ', kind: 'state' }, { code: 'HR', kind: 'state' },
  { code: 'HP', kind: 'state' }, { code: 'JK', kind: 'ut' }, { code: 'JH', kind: 'state' }, { code: 'KA', kind: 'state' },
  { code: 'KL', kind: 'state' }, { code: 'LA', kind: 'ut' }, { code: 'LD', kind: 'ut' }, { code: 'MP', kind: 'state' },
  { code: 'MH', kind: 'state' }, { code: 'MN', kind: 'state' }, { code: 'ML', kind: 'state' }, { code: 'MZ', kind: 'state' },
  { code: 'NL', kind: 'state' }, { code: 'OD', kind: 'state' }, { code: 'PY', kind: 'ut' }, { code: 'PB', kind: 'state' },
  { code: 'RJ', kind: 'state' }, { code: 'SK', kind: 'state' }, { code: 'TN', kind: 'state' }, { code: 'TG', kind: 'state' },
  { code: 'TR', kind: 'state' }, { code: 'UP', kind: 'state' }, { code: 'UT', kind: 'state' }, { code: 'WB', kind: 'state' },
] as const;

export type StateCode = (typeof STATES)[number]['code'];
export const STATE_CODES = STATES.map((s) => s.code) as readonly StateCode[];
export const isStateCode = (v: unknown): v is StateCode => typeof v === 'string' && (STATE_CODES as readonly string[]).includes(v);

/**
 * Contract for a FUTURE district dataset. No district data exists in this repository: lists must come from an
 * authoritative source (Local Government Directory, lgdirectory.gov.in) with per-language names reviewed by speakers,
 * and are loaded from `data/districts/<state-code>.json`. Until such a file is added and verified, the product asks for
 * State/UT only and makes NO district-specific eligibility claims.
 */
export interface DistrictRecord {
  /** LGD district code, as published. */
  lgdCode: string;
  stateCode: StateCode;
  /** Official English name as published by LGD. */
  name: string;
  /** Localized names keyed by language code; each entry must be reviewed before use. */
  localNames?: Partial<Record<string, string>>;
}

export interface DistrictDataset {
  stateCode: StateCode;
  source: { title: string; url: string; accessed: string };
  /** YYYY-MM-DD of the last human verification against the source. */
  lastVerified: string;
  districts: DistrictRecord[];
}
