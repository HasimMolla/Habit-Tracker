import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, SplashScreen, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as Notifications from 'expo-notifications';

import { HabitsProvider } from '@/state/HabitsProvider';
import {
  ONBOARDED_KEY,
  OnboardingProvider,
  useOnboarding,
} from '@/state/OnboardingProvider';
import { ProfileProvider, USER_NAME_KEY } from '@/state/ProfileProvider';
import { getMeta } from '@/db/database';
import { ensureChannel } from '@/lib/notifications';
import { useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Bootstrap = { onboarded: boolean; name: string };

export default function RootLayout() {
  const [initial, setInitial] = useState<Bootstrap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Reading meta also opens the database, so migrations finish before any
      // screen runs its first query.
      const [flag, name] = await Promise.all([
        getMeta(ONBOARDED_KEY),
        getMeta(USER_NAME_KEY),
      ]);
      await ensureChannel();
      if (cancelled) return;
      setInitial({ onboarded: flag === 'true', name: name ?? '' });
      await SplashScreen.hideAsync().catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (initial === null) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <OnboardingProvider initial={initial.onboarded}>
          <ProfileProvider initial={initial.name}>
            <HabitsProvider>
              <AppShell />
            </HabitsProvider>
          </ProfileProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { colors } = useTheme();
  const { onboarded } = useOnboarding();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  // Tapping a reminder lands on Today, where the habit can be ticked off.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        {/* Exactly one of these groups is reachable, so the router lands on the
            right entry screen without an explicit redirect. */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          {/* Detail pushes like a normal page; create/edit arrive as sheets. */}
          <Stack.Screen
            name="habit/detail/[id]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="habit/new"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="habit/[id]"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
