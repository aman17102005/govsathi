import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as S from '@govsathi/shared';
import { valueLabelKey } from '@govsathi/shared';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const en: Record<string, string> = {};
for (const f of ['common', 'app', 'vocab', 'geo']) Object.assign(en, JSON.parse(fs.readFileSync(path.join(root, 'locales/en', `${f}.json`), 'utf8')));

const missing = (keys: string[]) => keys.filter((k) => !(k in en));

describe('every value the UI can display has a reference message', () => {
  it('profile option values', () => {
    const groups: [readonly string[], string?][] = [
      [S.GENDERS], [S.CATEGORIES], [S.RELIGIONS], [S.MARITAL], [S.AREAS], [S.DISABILITY_TYPES], [S.EDUCATION_STATUS],
      [S.EDUCATION_LEVELS], [S.QUALIFICATIONS, 'qualification'], [S.OCCUPATIONS], [S.EMPLOYMENT_TYPES], [S.SECTORS],
      [S.NON_WORKING], [S.FARMER_ROLES], [S.FARM_ACTIVITIES], [S.HOUSING, 'housing'], [S.CIRCUMSTANCES],
    ];
    const keys = groups.flatMap(([vals, g]) => vals.map((v) => (g === 'housing' && v === 'none' ? 'opt.housing_none' : g === 'qualification' && v === 'none' ? 'opt.qual_none' : `opt.${v}`)));
    expect(missing(keys)).toEqual([]);
  });
  it('scheme vocabulary', () => {
    expect(missing(S.SCHEME_CATEGORIES.map((c) => `cat.${c}`))).toEqual([]);
    expect(missing(S.DOCUMENTS.map((d) => `doc.${d}`))).toEqual([]);
    expect(missing(S.STEPS.map((d) => `step.${d}`))).toEqual([]);
    expect(missing(S.CHANNELS.map((d) => `channel.${d}`))).toEqual([]);
    expect(missing(S.STATE_CODES.map((d) => `state.${d}`))).toEqual([]);
    expect(missing(Object.keys(S.DEPARTMENTS).map((d) => `dept.${d}`))).toEqual([]);
    expect(missing(['potentially_eligible', 'potential_match', 'more_info_required', 'some_criteria_do_not_match', 'informational_only'].map((x) => `status.${x}`))).toEqual([]);
  });
  it('every askable fact has a question label in the follow-up UI and (if enumerated) rule value labels', () => {
    const askLabels: Record<string, string> = {
      age: 'onb.age.label', gender: 'onb.gender.label', state: 'onb.state.label', area: 'onb.area.label', category: 'onb.category.label',
      disability: 'onb.disability.label', disabilityPercent: 'onb.disabilityPercent.label', maritalStatus: 'onb.marital.label',
      familyIncome: 'onb.income.label', personalIncome: 'onb.personalIncome.label', educationLevel: 'onb.eduLevel.label',
      occupation: 'onb.occupation.label', farmer: 'onb.agri.label', landOwner: 'onb.ownsLand.label', housing: 'onb.housing.label',
      hasLpg: 'onb.lpg.label', hasBankAccount: 'onb.bank.label', incomeTaxPayer: 'onb.tax.label', bpl: 'onb.bpl.label',
      pregnantOrLactating: 'onb.pregnant.label', wantsBusiness: 'onb.wantsBusiness.label', hasDaughterUnder10: 'onb.daughter.label',
    };
    expect(Object.keys(askLabels).sort()).toEqual([...S.ASKABLE_FACTS].sort());
    expect(missing(Object.values(askLabels))).toEqual([]);
    // a rule on an enumerated fact must be able to name every value the profile can hold
    expect(missing(S.EDUCATION_LEVELS.map((v) => valueLabelKey('educationLevel', v)))).toEqual([]);
  });
});
