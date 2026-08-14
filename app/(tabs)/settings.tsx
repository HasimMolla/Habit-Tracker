import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';

import { Icon } from '@/ui/Icon';
import { TextPromptSheet } from '@/ui/TextPromptSheet';
import { ScreenHeader, SCREEN_PADDING, Section } from '@/ui/Screen';
import { useHabits } from '@/state/HabitsProvider';
import { useProfile } from '@/state/ProfileProvider';
import { loadSampleData } from '@/db/seed';
import { resetAllData } from '@/db/database';
import {
  getPermissionState,
  requestPermission,
  rescheduleAll,
  scheduledCount,
  sendTestNotification,
  type PermissionState,
} from '@/lib/notifications';
import { radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { habits, refresh } = useHabits();
  const { name, save: saveName } = useProfile();

  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduled, setScheduled] = useState(0);
  const [busy, setBusy] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);

  const readNotificationState = useCallback(async () => {
    setPermission(await getPermissionState());
    setScheduled(await scheduledCount());
  }, []);

  // Permission can change in system settings while we're backgrounded.
  useFocusEffect(
    useCallback(() => {
      readNotificationState();
    }, [readNotificationState])
  );

  // Keep the OS schedule in step with the habits that exist.
  useEffect(() => {
    if (permission !== 'granted') return;
    rescheduleAll().then(setScheduled).catch(() => {});
  }, [permission, habits]);

  const handlePermission = async () => {
    haptics.selection();
    if (permission === 'denied') {
      Linking.openSettings();
      return;
    }
    const next = await requestPermission();
    setPermission(next);
    if (next === 'granted') {
      haptics.success();
      setScheduled(await rescheduleAll());
    }
  };

  const handleSampleData = () => {
    if (habits.length > 0) {
      Alert.alert(
        'Add sample data?',
        'This adds five example habits with a few weeks of history alongside your own.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add', onPress: runSampleData },
        ]
      );
      return;
    }
    runSampleData();
  };

  const runSampleData = async () => {
    setBusy(true);
    try {
      await loadSampleData();
      await refresh();
      await rescheduleAll();
      haptics.success();
    } catch {
      haptics.error();
      Alert.alert('Could not load sample data', 'Something went wrong while seeding history.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset all data?',
      'Every habit and all of its history will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await refresh();
            await rescheduleAll();
            haptics.warning();
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      haptics.warning();
      Alert.alert('Notifications are off', 'Allow notifications first to send a test.');
      return;
    }
    haptics.selection();
    await sendTestNotification();
    Alert.alert('Test scheduled', 'A notification will arrive in about five seconds.');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(8) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(320)}>
          <Section title="You">
            <View style={[styles.group, { backgroundColor: colors.surfaceContainer }]}>
              <Row
                icon="person"
                title="Your name"
                detail={name || 'Not set — Tally will just say "Today"'}
                accent={colors.primary}
                onPress={() => {
                  haptics.selection();
                  setNamePromptOpen(true);
                }}
              />
            </View>
          </Section>

          <Section title="Notifications">
            <View style={[styles.group, { backgroundColor: colors.surfaceContainer }]}>
              <Row
                icon={permission === 'granted' ? 'notifications' : 'notifications_off'}
                title="Permission"
                detail={PERMISSION_LABEL[permission]}
                accent={permission === 'granted' ? colors.primary : colors.error}
                action={
                  permission === 'granted'
                    ? undefined
                    : { label: permission === 'denied' ? 'Open settings' : 'Allow', onPress: handlePermission }
                }
              />
              <Divider />
              <Row
                icon="schedule"
                title="Scheduled reminders"
                detail={
                  permission === 'granted'
                    ? `${scheduled} queued`
                    : 'Enable notifications to schedule'
                }
                accent={colors.primary}
              />
              <Divider />
              <Row
                icon="bolt"
                title="Send a test notification"
                detail="Arrives in about five seconds"
                accent={colors.primary}
                onPress={handleTestNotification}
              />
            </View>
          </Section>

          <Section title="Data">
            <View style={[styles.group, { backgroundColor: colors.surfaceContainer }]}>
              <Row
                icon="database"
                title="Load sample data"
                detail={busy ? 'Seeding…' : 'Five habits with weeks of history'}
                accent={colors.primary}
                onPress={busy ? undefined : handleSampleData}
              />
              <Divider />
              <Row
                icon="restart_alt"
                title="Reset all data"
                detail="Delete every habit and its history"
                accent={colors.error}
                destructive
                onPress={handleReset}
              />
            </View>
          </Section>

          <Section title="About">
            <View style={[styles.group, { backgroundColor: colors.surfaceContainer }]}>
              <Row
                icon="widgets"
                title="Home screen widget"
                detail="Long-press your home screen, then pick Tally"
                accent={colors.primary}
              />
              <Divider />
              <Row
                icon="info"
                title="Version"
                detail={`Tally ${Constants.expoConfig?.version ?? '1.0.0'}`}
                accent={colors.primary}
              />
            </View>
          </Section>

          <Text style={[styles.footer, { color: colors.onSurfaceVariant }]}>
            Tally keeps everything on this device. No account, no sync, no tracking.
          </Text>
        </Animated.View>
      </ScrollView>

      <TextPromptSheet
        visible={namePromptOpen}
        title="Your name"
        description="Used to greet you on the Today screen. Stays on this device."
        placeholder="Your name"
        initial={name}
        maxLength={24}
        onCancel={() => setNamePromptOpen(false)}
        onConfirm={async (value) => {
          setNamePromptOpen(false);
          await saveName(value);
        }}
      />
    </View>
  );
}

const PERMISSION_LABEL: Record<PermissionState, string> = {
  granted: 'Allowed',
  denied: 'Blocked in system settings',
  undetermined: 'Not requested yet',
};

function Row({
  icon,
  title,
  detail,
  accent,
  destructive,
  onPress,
  action,
}: {
  icon: string;
  title: string;
  detail: string;
  accent: string;
  destructive?: boolean;
  onPress?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const { colors, tint } = useTheme();

  const body = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint(accent) }]}>
        <Icon name={icon} size={19} color={accent} />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, { color: destructive ? colors.error : colors.onSurface }]}
        >
          {title}
        </Text>
        <Text style={[styles.rowDetail, { color: colors.onSurfaceVariant }]}>{detail}</Text>
      </View>

      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.rowAction,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.rowActionLabel, { color: colors.onPrimary }]}>{action.label}</Text>
        </Pressable>
      ) : onPress ? (
        <Icon name="chevron_right" size={20} color={colors.outlineVariant} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingBottom: spacing(8),
  },
  group: {
    marginHorizontal: SCREEN_PADDING,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(3.5),
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    marginHorizontal: spacing(3),
  },
  rowTitle: {
    fontSize: 15.5,
    fontWeight: '500',
  },
  rowDetail: {
    marginTop: spacing(0.5),
    fontSize: 12.5,
  },
  rowAction: {
    paddingHorizontal: spacing(4),
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing(3.5) + 36 + spacing(3),
  },
  footer: {
    marginTop: spacing(7),
    paddingHorizontal: SCREEN_PADDING,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
});
