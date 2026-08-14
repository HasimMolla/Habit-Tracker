import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from './Icon';
import { isCounter, type Habit } from '@/db/schema';
import { formatTime } from '@/lib/dates';
import { contrastOn, radius, spacing, useTheme } from '@/theme/theme';

type HabitRowProps = {
  habit: Habit;
  done: boolean;
  /** Progress so far today, for counter habits. */
  count?: number;
  streak: number;
  onToggle: () => void;
};

/**
 * A checklist row: coloured icon tile on the left, name and context in the
 * middle, a circular checkbox on the right.
 *
 * Tapping anywhere on the row — or just the checkbox — marks the habit done.
 */
export function HabitRow({ habit, done, count = 0, streak, onToggle }: HabitRowProps) {
  const { colors, tint } = useTheme();

  const progress = useSharedValue(done ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(done ? 1 : 0, { damping: 15, stiffness: 200 });
  }, [done, progress]);

  const checkFill = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.35,
  }));

  const subtitle = buildSubtitle(habit, streak, count, done);
  const showStreakIcon = streak > 0 && !(isCounter(habit) && !done);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={habit.name}
      onPress={onToggle}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 160 });
      }}
    >
      <Animated.View
        style={[styles.row, { backgroundColor: colors.surfaceContainer }, containerStyle]}
      >
        <View style={[styles.tile, { backgroundColor: tint(habit.color, 'medium') }]}>
          <Icon name={habit.icon} size={22} color={habit.color} />
        </View>

        <Animated.View style={[styles.labels, labelStyle]}>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              {
                color: colors.onSurface,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}
          >
            {habit.name}
          </Text>
          {subtitle ? (
            <View style={styles.subtitleRow}>
              {showStreakIcon ? (
                <Icon
                  name="local_fire_department"
                  size={13}
                  color={habit.color}
                  style={styles.streakIcon}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
              >
                {subtitle}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${habit.name} ${done ? 'not done' : 'done'}`}
          accessibilityState={{ checked: done }}
          onPress={onToggle}
          hitSlop={12}
          style={styles.checkboxHit}
        >
          <View style={[styles.checkbox, { borderColor: done ? habit.color : colors.outline }]}>
            <Animated.View
              style={[styles.checkboxFill, { backgroundColor: habit.color }, checkFill]}
            />
            <Animated.View style={checkFill}>
              <Icon name="check" size={17} color={contrastOn(habit.color)} />
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

/** "36-day streak · 7:30 AM", or counter progress while one is running. */
function buildSubtitle(habit: Habit, streak: number, count: number, done: boolean): string {
  const parts: string[] = [];

  if (isCounter(habit) && !done) {
    parts.push(`${count} of ${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`);
  } else if (streak > 0) {
    parts.push(`${streak}-day streak`);
  }

  if (habit.reminderMinutes != null) parts.push(formatTime(habit.reminderMinutes));
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    marginBottom: spacing(2),
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: {
    flex: 1,
    marginHorizontal: spacing(3.5),
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(0.75),
  },
  streakIcon: {
    marginRight: spacing(1),
  },
  subtitle: {
    flexShrink: 1,
    fontSize: 12.5,
  },
  checkboxHit: {
    padding: spacing(1),
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
  },
});
