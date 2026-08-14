import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { setMeta } from '@/db/database';

export const ONBOARDED_KEY = 'onboarded';

type OnboardingContextValue = {
  onboarded: boolean;
  complete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: ReactNode;
}) {
  const [onboarded, setOnboarded] = useState(initial);

  const complete = useCallback(async () => {
    await setMeta(ONBOARDED_KEY, 'true');
    setOnboarded(true);
  }, []);

  const value = useMemo(() => ({ onboarded, complete }), [onboarded, complete]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  }
  return context;
}
