import type { Range } from '@govsathi/shared';
import type { DynamicT } from '../i18n/translate';
import { INCOME_BANDS, sameRange } from './options';

/** Localized label for an income range: an exact amount, or one of the predefined bands. */
export function formatIncome(r: Range, t: DynamicT, money: (n: number) => string): string {
  if (r.max === r.min) return money(r.min);
  const i = INCOME_BANDS.findIndex((b) => sameRange(b, r));
  if (i === 0) return t('onb.income.below', { max: money(r.max!) });
  if (r.max === null) return t('onb.income.above', { min: money(r.min) });
  return t('onb.income.between', { min: money(r.min), max: money(r.max) });
}
