import type { Range } from '@govsathi/shared';

/** Label key for an enumerated profile value (shared by the forms, review screen and rule text). */
export function optKey(value: string, group?: 'housing' | 'qualification'): string {
  if (group === 'housing' && value === 'none') return 'opt.housing_none';
  if (group === 'qualification' && value === 'none') return 'opt.qual_none';
  return `opt.${value}`;
}

/** Income bands (annual, INR). Edges sit on thresholds that real schemes use, so bands settle as many rules as possible. */
const EDGES = [0, 30000, 60000, 100000, 250000, 500000, 800000, 1800000];
export const INCOME_BANDS: Range[] = EDGES.map((min, i) => ({ min, max: EDGES[i + 1] ?? null }));

export const sameRange = (a?: Range, b?: Range) => !!a && !!b && a.min === b.min && a.max === b.max;
