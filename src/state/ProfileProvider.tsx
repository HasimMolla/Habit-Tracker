import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { setMeta } from '@/db/database';

export const USER_NAME_KEY = 'user_name';

type ProfileContextValue = {
  /** The name the user gave during onboarding, or empty if they skipped. */
  name: string;
  /** First word only — what we address them by. */
  firstName: string;
  save: (name: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const [name, setName] = useState(initial);

  const save = useCallback(async (next: string) => {
    const trimmed = next.trim();
    await setMeta(USER_NAME_KEY, trimmed);
    setName(trimmed);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ name, firstName: name.split(' ')[0] ?? '', save }),
    [name, save]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside <ProfileProvider>');
  }
  return context;
}
