import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Icon } from '@/ui/Icon';
import { HeatGraph } from '@/ui/HeatGraph';
import { useHabits } from '@/state/HabitsProvider';
import { archiveHabit } from '@/db/habits';
import { computeStats, rateOverLastDays } from '@/db/stats';
import { ALL_WEEKDAYS, isCounter, type Habit } from '@/db/schema';
import { WEEKDAY_LABELS, formatTime, type DayKey } from '@/lib/dates';
import { contrastOn, radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Number(id);

  const { colors, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const { habits, completions, today, toggle, refresh } = useHabits();

  const [editing, setEditing] = useState(false);

  const habit = habits.find((entry) => entry.id === habitId);
  const completed = useMemo(
    () => completions.get(habitId) ?? new Set<DayKey>(),
    [completions, habitId]
  );

  const stats = useMemo(
    () => (habit ? computeStats(habit, completed, today) : null),
    [habit, completed, today]
  );
  const recentRate = useMemo(
    () => (habit ? rateOverLastDays(habit, completed, 30, today) : 0),
    [habit, completed, today]
  );

  const handleArchive = useCallback(() => {
    if (!habit) return;
    haptics.warning();
    Alert.alert(
      `Archive ${habit.name}?`,
      'It leaves Today and Habits, but every day you logged is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archiveHabit(habit.id);
            await refresh();
            router.back();
          },
        },
      ]
    );
  }, [habit, refresh]);

  // The habit can vanish while this screen is mounted — archived or deleted
  // from the edit sheet. Bail out rather than render half a screen.
  if (!habit || !stats) {
    return <View style={[styles.root, { backgroundColor: colors.background }]} />;
  }

  const scheduledWeekdays = habit.frequency === 'daily' ? ALL_WEEKDAYS : habit.weekdays;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing(3) }]}>
        <CircleButton icon="arrow_back" onPress={() => router.back()} />
        <View style={styles.headerSpacer} />
        <CircleButton icon="archive" onPress={handleArchive} />
        <CircleButton
          icon="edit"
          onPress={() => {
            haptics.selection();
            router.push(`/habit/${habit.id}`);
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(300)} style={styles.identity}>
          <View style={[styles.bigIcon, { backgroundColor: tint(habit.color, 'medium') }]}>
            <Icon name={habit.icon} size={34} color={habit.color} />
          </View>
          <Text style={[styles.name, { color: colors.onBackground }]}>{habit.name}</Text>
          <Text style={[styles.schedule, { color: colors.onSurfaceVariant }]}>
            {describeSchedule(habit)}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={styles.statRow}>
          <StatCard
            icon="local_fire_department"
            iconColor={habit.color}
            value={stats.currentStreak}
            label="day streak"
          />
          <StatCard
            icon="emoji_events"
            iconColor="#FFCC00"
            value={stats.bestStreak}
            label="best streak"
          />
          <StatCard
            icon="trending_up"
            iconColor={colors.primary}
            value={`${Math.round(recentRate * 100)}%`}
            label="last 30 days"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(320).delay(120)}
          style={[styles.card, { backgroundColor: colors.surfaceContainer }]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>History</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: editing }}
              onPress={() => {
                haptics.selection();
                setEditing((prev) => !prev);
              }}
              style={[
                styles.editToggle,
                {
                  backgroundColor: editing ? habit.color : colors.surfaceContainerHigh,
                },
              ]}
            >
              <Icon
                name={editing ? 'check' : 'edit'}
                size={15}
                color={editing ? contrastOn(habit.color) : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.editLabel,
                  { color: editing ? contrastOn(habit.color) : colors.onSurfaceVariant },
                ]}
              >
                {editing ? 'Done' : 'Edit'}
              </Text>
            </Pressable>
          </View>

          {editing ? (
            <Text style={[styles.editHint, { color: colors.onSurfaceVariant }]}>
              Tap any day to mark it done or undo it.
            </Text>
          ) : null}

          <HeatGraph
            completed={completed}
            scheduledWeekdays={scheduledWeekdays}
            color={habit.color}
            weeks={20}
            scrollable
            onDayPress={
              editing
                ? (day) => {
                    toggle(habit.id, day);
                  }
                : undefined
            }
          />

          <View style={[styles.totals, { borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.totalsText, { color: colors.onSurfaceVariant }]}>
              {stats.totalCompletions} day{stats.totalCompletions === 1 ? '' : 's'} logged
              {isCounter(habit) ? ` · target ${habit.targetCount} ${habit.unit ?? ''}`.trimEnd() : ''}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function CircleButton({ icon, onPress }: { icon: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleButton,
        { backgroundColor: colors.surfaceContainerHigh, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Icon name={icon} size={20} color={colors.onSurface} />
    </Pressable>
  );
}

function StatCard({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: string;
  iconColor: string;
  value: number | string;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer }]}>
      <Icon name={icon} size={20} color={iconColor} />
      <Text style={[styles.statValue, { color: colors.onSurface }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

function describeSchedule(habit: Habit): string {
  const schedule =
    habit.frequency === 'daily'
      ? 'Every day'
      : habit.weekdays.map((day) => WEEKDAY_LABELS[day]).join(' ');
  if (habit.reminderMinutes == null) return schedule;
  return `${schedule} · ${formatTime(habit.reminderMinutes)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(2),
  },
  headerSpacer: { flex: 1 },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing(5),
  },
  identity: {
    alignItems: 'center',
    paddingTop: spacing(4),
    paddingBottom: spacing(7),
  },
  bigIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(4),
  },
  name: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  schedule: {
    marginTop: spacing(1.5),
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing(2.5),
    marginBottom: spacing(3),
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing(4),
    alignItems: 'center',
  },
  statValue: {
    marginTop: spacing(2),
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  statLabel: {
    marginTop: spacing(0.5),
    fontSize: 11.5,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3.5),
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  editToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    height: 32,
    borderRadius: radius.full,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  editHint: {
    marginBottom: spacing(3),
    fontSize: 12.5,
  },
  totals: {
    marginTop: spacing(4),
    paddingTop: spacing(3),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalsText: {
    fontSize: 12.5,
  },
});
