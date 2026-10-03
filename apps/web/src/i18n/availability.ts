import { LANGUAGES, type LocaleMeta } from '@govsathi/shared';

const metas = import.meta.glob<LocaleMeta>('../../../../locales/*/meta.json', { eager: true, import: 'default' });

const statusOf = (code: string) => Object.entries(metas).find(([p]) => p.includes(`/locales/${code}/`))?.[1]?.status;

/**
 * Languages offered in the picker. Locale quality status is internal metadata and is never shown to citizens.
 *
 * Policy: a production build offers only locales whose status is "reviewed" (a real human review record,
 * enforced by the i18n check). Unreviewed drafts are offered only in development, or in a build made with
 * VITE_ENABLE_UNREVIEWED_LOCALES=1 (internal preview / native-review sessions - never a public launch).
 * The currently selected language always stays available.
 */
export function pickerLanguages(current: string): (typeof LANGUAGES)[number][] {
  const showAll = import.meta.env.DEV || import.meta.env.VITE_ENABLE_UNREVIEWED_LOCALES === '1';
  if (showAll) return [...LANGUAGES];
  return LANGUAGES.filter((l) => l.code === current || statusOf(l.code) === 'reviewed');
}
