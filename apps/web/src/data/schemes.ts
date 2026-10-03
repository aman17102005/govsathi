import { currentState, isCitizenVisible, isoDay, isRecommendable, type CurrentState, type Scheme } from '@govsathi/shared';

// Scheme records are bundled with the app so details, saved items and comparison work offline.
const modules = import.meta.glob<Scheme>('../../../../data/schemes/**/*.json', { eager: true, import: 'default' });

/**
 * Records a citizen may open: published/updated, or withdrawn (suspended/discontinued, so a saved link can say so).
 * Records still being verified, and held records, are bundled for the build but never reachable from the UI.
 */
export const ALL_SCHEMES: Scheme[] = Object.values(modules)
  .filter(isCitizenVisible)
  .sort((a, b) => a.id.localeCompare(b.id));

const byId = new Map(ALL_SCHEMES.map((s) => [s.id, s]));
export const getScheme = (id: string): Scheme | undefined => byId.get(id);

const today = () => isoDay(new Date());

/** What may be recommended or listed as an opportunity TODAY (publication gate + current date). */
export const listedSchemes = (): Scheme[] => {
  const d = today();
  return ALL_SCHEMES.filter((s) => isRecommendable(s, d));
};

export const stateOf = (s: Scheme): CurrentState => currentState(s, today());
