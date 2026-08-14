import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from '@/db/schema';
import { listHabits } from '@/db/habits';

const CHANNEL_ID = 'habit-reminders';

/** Reminders are silent-but-visible while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/**
 * Android 8+ requires an explicit channel or notifications are silently
 * dropped. Safe to call repeatedly — creating an existing channel is a no-op.
 */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Habit reminders',
    description: 'Daily nudges for the habits you have set a reminder on.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  const settings = await Notifications.requestPermissionsAsync();
  if (settings.granted) {
    await ensureChannel();
    return 'granted';
  }
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Rebuilds the whole schedule from the database. Cancelling everything and
 * re-adding is far more reliable than tracking individual identifiers across
 * edits, and the notification count here is small (one per habit per weekday).
 */
export async function rescheduleAll(): Promise<number> {
  const state = await getPermissionState();
  if (state !== 'granted') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return 0;
  }

  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const habits = await listHabits();
  let scheduled = 0;

  for (const habit of habits) {
    scheduled += await scheduleForHabit(habit);
  }
  return scheduled;
}

async function scheduleForHabit(habit: Habit): Promise<number> {
  if (habit.reminderMinutes == null) return 0;

  const hour = Math.floor(habit.reminderMinutes / 60);
  const minute = habit.reminderMinutes % 60;
  const content: Notifications.NotificationContentInput = {
    title: habit.name,
    body: 'Tap to tick it off in Tally.',
    data: { habitId: habit.id },
  };

  if (habit.frequency === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: CHANNEL_ID,
        hour,
        minute,
      },
    });
    return 1;
  }

  let count = 0;
  for (const weekday of habit.weekdays) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: CHANNEL_ID,
        // expo-notifications counts 1 = Sunday; we store 0 = Sunday.
        weekday: weekday + 1,
        hour,
        minute,
      },
    });
    count += 1;
  }
  return count;
}

export async function scheduledCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}

/** Fires a notification a few seconds out, so Settings can prove it works. */
export async function sendTestNotification(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tally is set up',
      body: 'Reminders will arrive like this at the times you choose.',
      data: { test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      channelId: CHANNEL_ID,
      seconds: 5,
    },
  });
}
