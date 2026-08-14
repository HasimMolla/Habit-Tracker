import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/theme/theme';

/**
 * A real Material 3 bottom navigation bar rendered by the platform, with
 * Material Symbols that swap to their filled variant when selected.
 */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surfaceContainer}
      tintColor={colors.onSecondaryContainer}
      indicatorColor={colors.secondaryContainer}
      labelStyle={{ color: colors.onSurfaceVariant }}
      // Material's default only labels the selected tab; with four
      // similar-looking symbols that leaves the other three ambiguous.
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md={{ default: 'today', selected: 'today' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="habits">
        <NativeTabs.Trigger.Icon md={{ default: 'checklist', selected: 'checklist' }} />
        <NativeTabs.Trigger.Label>Habits</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon md={{ default: 'calendar_month', selected: 'calendar_month' }} />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon md={{ default: 'settings', selected: 'settings' }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
