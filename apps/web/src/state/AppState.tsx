import { aiSettings } from '../lib/aiSettings';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deriveFacts, emptyProfile, type Facts, type UserProfile } from '@govsathi/shared';
import { store } from '../lib/storage';

const K = { profile: 'govsathi.profile.v1', saved: 'govsathi.saved.v1', compare: 'govsathi.compare.v1', onboarded: 'govsathi.onboarded.v1' };
export const MAX_COMPARE = 4;

interface AppState {
  profile: UserProfile;
  facts: Facts;
  onboarded: boolean;
  /** Merge a patch; keys set to undefined are removed. */
  update: (patch: Partial<UserProfile>) => void;
  /** Record that the citizen declined a question, or clear that record when they answer it. */
  setSkipped: (key: string, skipped: boolean) => void;
  completeOnboarding: () => void;
  saved: string[];
  toggleSaved: (id: string) => void;
  compare: string[];
  toggleCompare: (id: string) => boolean;
  clearCompare: () => void;
  deleteAll: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppStateProvider>');
  return v;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => ({ ...emptyProfile(), ...store.get<UserProfile>(K.profile, emptyProfile()) }));
  const [saved, setSaved] = useState<string[]>(() => store.get<string[]>(K.saved, []));
  const [compare, setCompare] = useState<string[]>(() => store.get<string[]>(K.compare, []));
  const [onboarded, setOnboarded] = useState<boolean>(() => store.get<boolean>(K.onboarded, false));

  useEffect(() => store.set(K.profile, profile), [profile]);
  useEffect(() => store.set(K.saved, saved), [saved]);
  useEffect(() => store.set(K.compare, compare), [compare]);
  useEffect(() => store.set(K.onboarded, onboarded), [onboarded]);

  const update = useCallback((patch: Partial<UserProfile>) => {
    setProfile((p) => {
      const next: UserProfile = { ...p, ...patch };
      for (const k of Object.keys(patch) as (keyof UserProfile)[]) if (patch[k] === undefined) delete next[k];
      return next;
    });
  }, []);

  const setSkipped = useCallback((key: string, skip: boolean) => {
    setProfile((p) => {
      const cur = new Set(p.skipped ?? []);
      if (skip) cur.add(key);
      else cur.delete(key);
      return { ...p, skipped: [...cur] };
    });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      profile,
      facts: deriveFacts(profile),
      onboarded,
      update,
      setSkipped,
      completeOnboarding: () => setOnboarded(true),
      saved,
      toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      compare,
      toggleCompare: (id) => {
        if (compare.includes(id)) {
          setCompare(compare.filter((x) => x !== id));
          return true;
        }
        if (compare.length >= MAX_COMPARE) return false;
        setCompare([...compare, id]);
        return true;
      },
      clearCompare: () => setCompare([]),
      deleteAll: () => {
        setProfile(emptyProfile());
        setSaved([]);
        setCompare([]);
        setOnboarded(false);
        for (const k of Object.values(K)) store.remove(k);
        aiSettings.clear(); // "delete everything" also removes the citizen's AI key
      },
    }),
    [profile, onboarded, update, setSkipped, saved, compare],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
