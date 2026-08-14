import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { EmptyState } from '@/ui/EmptyState';
import { DraggableList } from '@/ui/DraggableList';
import { Icon } from '@/ui/Icon';
import { HeatGraph } from '@/ui/HeatGraph';
import { ScreenHeader, SCREEN_PADDING } from '@/ui/Screen';
import { useHabits } from '@/state/HabitsProvider';
import { reorderHabits } from '@/db/habits';
import { currentStreak } from '@/db/stats';
import { ALL_WEEKDAYS, type Habit } from '@/db/schema';
import { WEEKDAY_LABELS, type DayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

const ROW_HEIGHT = 78;

export default function HabitsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { habits, completions, today, loading, refresh } = useHabits();

  const handleReorder = useCallback(
    async (ids: number[]) => {
      haptics.success();
      await reorderHabits(ids);
      await refresh();
    },
    [refresh]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Habits"
        subtitle={habits.length > 0 ? 'Long-press to reorder' : undefined}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add habit"
            onPress={() => {
              haptics.selection();
              router.push('/habit/new');
            }}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primaryContainer, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon name="add" size={24} color={colors.onPrimaryContainer} />
          </Pressable>
        }
      />

      {loading ? null : habits.length === 0 ? (
        <EmptyState
          icon="checklist"
          title="No habits yet"
          description="Start with one small thing you want to do consistently."
          action={{ label: 'Create your first habit', onPress: () => router.push('/habit/new') }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing(8) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(280)}>
            <DraggableList
              items={habits}
              itemHeight={ROW_HEIGHT}
              onReorder={handleReorder}
              renderItem={(habit) => (
                <HabitCard
                  habit={habit}
                  streak={currentStreak(habit, completions.get(habit.id) ?? new Set(), today)}
                  completed={completions.get(habit.id) ?? new Set()}
                />
              )}
            />
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

function HabitCard({
  habit,
  streak,
  completed,
}: {
  habit: Habit;
  streak: number;
  completed: Set<DayKey>;
}) {
  const { colors, tint } = useTheme();
  const scheduledWeekdays = habit.frequency === 'daily' ? ALL_WEEKDAYS : habit.weekdays;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={habit.name}
      onPress={() => {
        haptics.selection();
        router.push(`/habit/detail/${habit.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceContainer, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.well, { backgroundColor: tint(habit.color) }]}>
        <Icon name={habit.icon} size={22} color={habit.color} />
      </View>

      <View style={styles.cardText}>
        <Text numberOfLines={1} style={[styles.cardName, { color: colors.onSurface }]}>
          {habit.name}
        </Text>
        <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.onSurfaceVariant }]}>
          {describeSchedule(habit, streak)}
        </Text>
      </View>

      {/* A five-week thumbnail: enough to read the recent trend at a glance
          without competing with the full graph on the detail screen. */}
      <View style={styles.miniGraph} pointerEvents="none">
        <HeatGraph
          completed={completed}
          scheduledWeekdays={scheduledWeekdays}
          color={habit.color}
          weeks={4}
          showLabels={false}
        />
      </View>

      <Icon name="chevron_right" size={20} color={colors.outlineVariant} />
    </Pressable>
  );
}

/**
 * "2-day streak · Every day".
 *
 * Streak leads because it is the changing number people look for; the reminder
 * time is deliberately omitted here — the mini graph takes most of the row, and
 * Today already shows the time next to each habit.
 */
function describeSchedule(habit: Habit, streak: number): string {
  const schedule =
    habit.frequency === 'daily'
      ? 'Every day'
      : habit.weekdays.length === 0
        ? 'No days selected'
        : habit.weekdays.map((day) => WEEKDAY_LABELS[day]).join(' ');

  return streak > 0 ? `${streak}-day streak · ${schedule}` : schedule;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT - spacing(2),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
  },
  well: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    marginHorizontal: spacing(3.5),
  },
  miniGraph: {
    marginRight: spacing(2.5),
    transform: [{ scale: 0.62 }],
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  cardMeta: {
    marginTop: spacing(0.75),
    fontSize: 12.5,
  },
});
