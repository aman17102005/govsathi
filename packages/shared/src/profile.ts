import type { StateCode } from './geo';

/** Annual amounts in INR. An exact figure has min === max; a band has min < max (max may be Infinity-as-null). */
export interface Range {
  min: number;
  max: number | null; // null = no upper bound
}

export const GENDERS = ['female', 'male', 'transgender', 'other'] as const;
export const CATEGORIES = ['general', 'obc', 'sc', 'st'] as const;
export const RELIGIONS = ['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'parsi', 'other'] as const;
export const MARITAL = ['single', 'married', 'widowed', 'divorced'] as const;
export const AREAS = ['rural', 'urban'] as const;
export const DISABILITY_TYPES = ['locomotor', 'visual', 'hearing', 'speech', 'intellectual', 'mental_illness', 'multiple', 'other'] as const;
export const EDUCATION_STATUS = ['not_studying', 'school', 'college', 'vocational'] as const;
export const EDUCATION_LEVELS = ['class_1_8', 'class_9_10', 'class_11_12', 'diploma_iti', 'undergraduate', 'postgraduate', 'doctorate'] as const;
export const QUALIFICATIONS = ['none', 'primary', 'class_8', 'class_10', 'class_12', 'diploma_iti', 'graduate', 'postgraduate', 'doctorate'] as const;
export const OCCUPATIONS = [
  'farmer', 'agri_labourer', 'construction_worker', 'street_vendor', 'artisan', 'business_owner',
  'salaried_private', 'govt_employee', 'daily_wage', 'domestic_worker', 'other',
] as const;
export const EMPLOYMENT_TYPES = ['salaried', 'self_employed', 'casual', 'contract', 'other'] as const;
export const SECTORS = ['agriculture', 'manufacturing', 'construction', 'services', 'trade', 'government', 'other'] as const;
export const NON_WORKING = ['student', 'unemployed', 'homemaker', 'retired', 'looking_for_work', 'other'] as const;
export const FARMER_ROLES = ['landowner', 'tenant', 'agri_labourer', 'allied'] as const;
export const FARM_ACTIVITIES = ['crops', 'horticulture', 'dairy', 'fisheries', 'poultry', 'other'] as const;
export const HOUSING = ['own_pucca', 'own_kutcha', 'rented', 'none'] as const;
export const CIRCUMSTANCES = ['pregnant_or_lactating', 'orphan', 'shg_member', 'migrant_worker', 'wants_start_business'] as const;

export type Gender = (typeof GENDERS)[number];
export type Category = (typeof CATEGORIES)[number];
export type Religion = (typeof RELIGIONS)[number];
export type Marital = (typeof MARITAL)[number];
export type Area = (typeof AREAS)[number];
export type DisabilityType = (typeof DISABILITY_TYPES)[number];
export type EducationStatus = (typeof EDUCATION_STATUS)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type Qualification = (typeof QUALIFICATIONS)[number];
export type Occupation = (typeof OCCUPATIONS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type Sector = (typeof SECTORS)[number];
export type NonWorking = (typeof NON_WORKING)[number];
export type FarmerRole = (typeof FARMER_ROLES)[number];
export type FarmActivity = (typeof FARM_ACTIVITIES)[number];
export type Housing = (typeof HOUSING)[number];
export type Circumstance = (typeof CIRCUMSTANCES)[number];

/**
 * The citizen's self-reported profile. Stored ONLY on the device. Every field is optional: `undefined` means
 * unknown or skipped, and the eligibility engine never guesses it. `skipped` records fields the user declined
 * so the assistant does not ask for them again.
 */
export interface UserProfile {
  version: 1;
  name?: string;
  ageYears?: number;
  dateOfBirth?: string; // YYYY-MM-DD; if present, age is derived from it
  gender?: Gender;
  state?: StateCode;
  district?: string;
  area?: Area;
  category?: Category;
  religion?: Religion;
  disability?: boolean;
  disabilityType?: DisabilityType;
  disabilityPercent?: number;
  veteran?: boolean;
  maritalStatus?: Marital;
  singleParent?: boolean;
  familyIncome?: Range;
  familySize?: number;
  dependents?: number;
  children?: number;
  hasDaughterUnder10?: boolean;
  educationStatus?: EducationStatus;
  qualification?: Qualification;
  educationLevel?: EducationLevel;
  working?: boolean;
  employmentType?: EmploymentType;
  occupation?: Occupation;
  sector?: Sector;
  personalIncome?: Range;
  jobSeeker?: boolean;
  nonWorking?: NonWorking;
  agriculture?: boolean;
  farmerRole?: FarmerRole;
  ownsFarmland?: boolean;
  landHoldingHa?: number;
  farmActivity?: FarmActivity;
  housing?: Housing;
  hasLpg?: boolean;
  hasBankAccount?: boolean;
  incomeTaxPayer?: boolean;
  bpl?: boolean;
  circumstances?: Circumstance[];
  skipped?: string[];
}

export const emptyProfile = (): UserProfile => ({ version: 1 });

export function ageFromDob(dob: string, today = new Date()): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}
