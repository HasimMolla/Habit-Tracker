import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { EmptyState } from '@/ui/EmptyState';
import { HeatGraph } from '@/ui/HeatGraph';
import { Icon } from '@/ui/Icon';
import { ScreenHeader, SCREEN_PADDING } from '@/ui/Screen';
import { useHabits } from '@/state/HabitsProvider';
import { computeStats } from '@/db/stats';
import { ALL_WEEKDAYS, type Habit } from '@/db/schema';
import type { DayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme/theme';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { habits, completions, today, loading } = useHabits();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="History" subtitle="Consistency at a glance" />

      {loading ? null : habits.length === 0 ? (
        <EmptyState
          icon="calendar_month"
          title="No history yet"
          description="Once you have a habit and start ticking days off, your graph appears here."
          action={{ label: 'Add a habit', onPress: () => router.push('/habit/new') }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing(8) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {habits.map((habit, index) => (
            <Animated.View
              key={habit.id}
              entering={FadeInDown.duration(340).delay(60 + index * 60)}
            >
              <HabitHistoryCard
                habit={habit}
                completed={completions.get(habit.id) ?? new Set()}
                today={today}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function HabitHistoryCard({
  habit,
  completed,
  today,
}: {
  habit: Habit;
  completed: Set<DayKey>;
  today: DayKey;
}) {
  const { colors, tint } = useTheme();
  const stats = useMemo(() => computeStats(habit, completed, today), [habit, completed, today]);
  const scheduledWeekdays = habit.frequency === 'daily' ? ALL_WEEKDAYS : habit.weekdays;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.well, { backgroundColor: tint(habit.color) }]}>
          <Icon name={habit.icon} size={20} color={habit.color} />
        </View>
        <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.onSurface }]}>
          {habit.name}
        </Text>
      </View>

      <HeatGraph
        completed={completed}
        scheduledWeekdays={scheduledWeekdays}
        color={habit.color}
        weeks={20}
        scrollable
      />

      <View style={[styles.stats, { borderTopColor: colors.outlineVariant }]}>
        <Stat label="Current" value={`${stats.currentStreak}`} suffix="days" color={habit.color} />
        <Stat label="Best" value={`${stats.bestStreak}`} suffix="days" color={habit.color} />
        <Stat
          label="Rate"
          value={`${Math.round(stats.completionRate * 100)}`}
          suffix="%"
          color={habit.color}
        />
        <Stat label="Total" value={`${stats.totalCompletions}`} suffix="done" color={habit.color} />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: string;
  suffix: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={[styles.statSuffix, { color: colors.onSurfaceVariant }]}>{suffix}</Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    gap: spacing(3),
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  well: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    marginLeft: spacing(3),
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing(4),
    paddingTop: spacing(3.5),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(0.75),
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statSuffix: {
    fontSize: 11,
  },
  statLabel: {
    marginTop: spacing(0.5),
    fontSize: 11.5,
  },
});
