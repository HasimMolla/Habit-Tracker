import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { EmptyState } from '@/ui/EmptyState';
import { HabitRow } from '@/ui/HabitRow';
import { Celebration } from '@/ui/Celebration';
import { Snackbar } from '@/ui/Snackbar';
import { ScreenHeader, SCREEN_PADDING } from '@/ui/Screen';
import { useHabits } from '@/state/HabitsProvider';
import { useProfile } from '@/state/ProfileProvider';
import { currentStreak } from '@/db/stats';
import type { Habit } from '@/db/schema';
import { formatLongDate, greetingFor } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme/theme';

/** Reminder-time boundaries for the day's sections, in minutes from midnight. */
const MORNING_END = 12 * 60;
const AFTERNOON_END = 17 * 60;

export default function TodayScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { firstName } = useProfile();
  const {
    todaysHabits,
    doneToday,
    todayCounts,
    completions,
    today,
    loading,
    toggle,
    justCompletedAll,
    acknowledgeCompletedAll,
    lastAction,
    undoLast,
    dismissUndo,
  } = useHabits();

  const streaks = useMemo(() => {
    const map = new Map<number, number>();
    for (const habit of todaysHabits) {
      map.set(habit.id, currentStreak(habit, completions.get(habit.id) ?? new Set(), today));
    }
    return map;
  }, [todaysHabits, completions, today]);

  const sections = useMemo(() => groupByTimeOfDay(todaysHabits), [todaysHabits]);

  const total = todaysHabits.length;
  const done = doneToday.size;
  const allDone = total > 0 && done === total;

  const undoHabit = lastAction
    ? todaysHabits.find((habit) => habit.id === lastAction.habitId)
    : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* A greeting reads as the app talking to you; the plain date carries the
          "which day am I looking at" job underneath it. */}
      <ScreenHeader
        title={firstName ? `${greetingFor()}, ${firstName}` : 'Today'}
        subtitle={formatLongDate(today)}
      />

      {loading ? null : total === 0 ? (
        <EmptyState
          icon="today"
          title="Nothing scheduled today"
          description="Add a habit and it will show up here on the days you choose."
          action={{ label: 'Add a habit', onPress: () => router.push('/habit/new') }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing(10) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(360).delay(60)}
            style={[styles.progressCard, { backgroundColor: colors.surfaceContainerHigh }]}
          >
            <View style={styles.progressText}>
              <Text style={[styles.progressCount, { color: colors.onSurface }]}>
                {done} of {total} done
              </Text>
              {allDone ? (
                <Text style={[styles.progressLabel, { color: colors.onSurfaceVariant }]}>
                  Nice work.
                </Text>
              ) : null}
            </View>

            <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
              <Animated.View
                layout={LinearTransition.duration(360)}
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.round((done / total) * 100)}%`,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {sections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              {/* Only worth a header once the day actually splits into parts. */}
              {sections.length > 1 ? (
                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                  {section.title}
                </Text>
              ) : null}

              {section.habits.map((habit, index) => (
                <Animated.View
                  key={habit.id}
                  entering={FadeInDown.duration(320).delay(
                    100 + (sectionIndex * 2 + index) * 40
                  )}
                  layout={LinearTransition.duration(240)}
                >
                  <HabitRow
                    habit={habit}
                    done={doneToday.has(habit.id)}
                    count={todayCounts.get(habit.id) ?? 0}
                    streak={streaks.get(habit.id) ?? 0}
                    onToggle={() => toggle(habit.id, today)}
                  />
                </Animated.View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <Snackbar
        visible={Boolean(lastAction && undoHabit)}
        message={
          undoHabit
            ? `${undoHabit.name} ${lastAction?.nowComplete ? 'completed' : 'un-checked'}`
            : ''
        }
        actionLabel="Undo"
        onAction={undoLast}
        onDismiss={dismissUndo}
      />

      <Celebration
        visible={justCompletedAll}
        name={firstName}
        onDone={acknowledgeCompletedAll}
      />
    </View>
  );
}

type Section = { title: string; habits: Habit[] };

/**
 * Splits the day by each habit's reminder time. Habits without a reminder are
 * "Anytime". Empty sections never appear, and the headers stay hidden entirely
 * when everything lands in one bucket — a short list stays a plain list.
 */
function groupByTimeOfDay(habits: Habit[]): Section[] {
  const buckets: Record<string, Habit[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
    Anytime: [],
  };

  for (const habit of habits) {
    if (habit.reminderMinutes == null) buckets.Anytime.push(habit);
    else if (habit.reminderMinutes < MORNING_END) buckets.Morning.push(habit);
    else if (habit.reminderMinutes < AFTERNOON_END) buckets.Afternoon.push(habit);
    else buckets.Evening.push(habit);
  }

  return Object.entries(buckets)
    .filter(([, entries]) => entries.length > 0)
    .map(([title, entries]) => ({ title, habits: entries }));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
  },
  progressCard: {
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(5),
  },
  progressText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(2),
  },
  progressCount: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  progressLabel: {
    fontSize: 13.5,
    flex: 1,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    marginTop: spacing(3),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  section: {
    marginBottom: spacing(2),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(2),
    marginTop: spacing(1),
  },
});
