import { isScheduledOn, type Habit } from './schema';
import { addDays, daysBetween, todayKey, weekdayOf, type DayKey } from '@/lib/dates';

export type HabitStats = {
  currentStreak: number;
  bestStreak: number;
  /** Completed scheduled days ÷ total scheduled days, 0–1. */
  completionRate: number;
  totalCompletions: number;
};

/** Hard ceiling on how far back we ever walk, so a corrupt date can't hang the UI. */
const MAX_LOOKBACK_DAYS = 365 * 5;

/**
 * Current streak counts back over *scheduled* days only. Today is treated as a
 * grace day: an unfinished habit doesn't break the streak until the day ends.
 */
export function currentStreak(habit: Habit, completed: Set<DayKey>, today = todayKey()): number {
  const earliest = earliestDay(habit, today);
  let cursor = today;

  // If today is scheduled but not yet done, start counting from yesterday.
  if (isScheduledOn(habit, weekdayOf(cursor)) && !completed.has(cursor)) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (daysBetween(earliest, cursor) >= 0) {
    if (isScheduledOn(habit, weekdayOf(cursor))) {
      if (!completed.has(cursor)) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive scheduled days ever completed. */
export function bestStreak(habit: Habit, completed: Set<DayKey>, today = todayKey()): number {
  const earliest = earliestDay(habit, today);
  let best = 0;
  let run = 0;
  let cursor = earliest;

  while (daysBetween(cursor, today) >= 0) {
    if (isScheduledOn(habit, weekdayOf(cursor))) {
      if (completed.has(cursor)) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

export function computeStats(
  habit: Habit,
  completed: Set<DayKey>,
  today = todayKey()
): HabitStats {
  const earliest = earliestDay(habit, today);
  let scheduled = 0;
  let done = 0;
  let cursor = earliest;

  while (daysBetween(cursor, today) >= 0) {
    if (isScheduledOn(habit, weekdayOf(cursor))) {
      scheduled += 1;
      if (completed.has(cursor)) done += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return {
    currentStreak: currentStreak(habit, completed, today),
    bestStreak: bestStreak(habit, completed, today),
    completionRate: scheduled === 0 ? 0 : done / scheduled,
    totalCompletions: completed.size,
  };
}

/**
 * Where history starts for a habit: its creation day, clamped to
 * MAX_LOOKBACK_DAYS. Seeded habits backdate `created_at` to the start of their
 * generated history so that history is counted rather than skipped.
 */
function earliestDay(habit: Habit, today: DayKey): DayKey {
  const floor = addDays(today, -MAX_LOOKBACK_DAYS);
  if (daysBetween(floor, habit.createdAt) < 0) return floor;
  if (daysBetween(habit.createdAt, today) < 0) return today;
  return habit.createdAt;
}

/**
 * Completion rate over a recent window, counting only scheduled days.
 *
 * Distinct from `completionRate`, which spans the habit's whole life. A
 * "last 30 days" figure is what tells you whether things are going well *now*.
 */
export function rateOverLastDays(
  habit: Habit,
  completed: Set<DayKey>,
  days: number,
  today = todayKey()
): number {
  let scheduled = 0;
  let done = 0;

  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    if (daysBetween(habit.createdAt, day) < 0) continue;
    if (!isScheduledOn(habit, weekdayOf(day))) continue;
    scheduled += 1;
    if (completed.has(day)) done += 1;
  }

  return scheduled === 0 ? 0 : done / scheduled;
}
