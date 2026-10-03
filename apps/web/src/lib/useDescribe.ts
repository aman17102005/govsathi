import { useMemo } from 'react';
import { departmentId, isOfficialUrl, describeBenefit, describeDepartment, describeRule, describeStates, type DescribeCtx, type Scheme } from '@govsathi/shared';
import { evaluate, type EligibilityResult } from '@govsathi/eligibility';
import { useI18n } from '../i18n';
import { useApp } from '../state/AppState';

/** Localized text builders for structured scheme data. */
export function useDescribe() {
  const { td, money } = useI18n();
  return useMemo(() => {
    const ctx: DescribeCtx = { t: td, money };
    return {
      ctx,
      benefit: (b: Scheme['benefits'][number]) => describeBenefit(b, ctx),
      rule: (r: Scheme['rules'][number]) => describeRule(r, ctx),
      states: (codes: readonly string[]) => describeStates(codes, ctx),
      dept: (name: string) => describeDepartment(name, ctx),
      /** Localized publisher name when it is a registered government body; otherwise undefined (the web domain identifies the source). */
      publisher: (name: string) => {
        const norm = name.replace(' & ', ' and ');
        return departmentId(norm) ? describeDepartment(norm, ctx) : undefined;
      },
    };
  }, [td, money]);
}

/** Eligibility of a scheme for the on-device profile, recomputed locally so it always reflects the latest answers. */
export function useEligibility(scheme: Scheme): EligibilityResult {
  const { facts } = useApp();
  return useMemo(() => evaluate(scheme, facts), [scheme, facts]);
}

/** Only an official (https, gov.in/nic.in) link is ever offered as "the official source". */
export const officialUrl = (s: Scheme): string | undefined => (s.apply.url && isOfficialUrl(s.apply.url) ? s.apply.url : s.sources.find((x) => isOfficialUrl(x.url))?.url);

export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
