import type { DayKey } from '@/lib/dates';

export type Frequency = 'daily' | 'weekly';

export type Habit = {
  id: number;
  name: string;
  /** Material Symbols name, e.g. `directions_walk`. */
  icon: string;
  /** Accent colour as `#RRGGBB`. */
  color: string;
  frequency: Frequency;
  /** Scheduled weekdays (0 = Sunday). Always all seven when frequency is `daily`. */
  weekdays: number[];
  /** Minutes from midnight, or null when no reminder is set. */
  reminderMinutes: number | null;
  /**
   * How many times a day counts as done. 1 is a plain tick; anything higher
   * makes this a counter habit ("8 glasses").
   */
  targetCount: number;
  /** Label for the count, e.g. "glasses". Null for plain tick habits. */
  unit: string | null;
  /** Set when archived — hidden from Today, history preserved. */
  archivedAt: DayKey | null;
  sortOrder: number;
  createdAt: DayKey;
};

export type HabitRow = {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
  weekdays: string;
  reminder_minutes: number | null;
  target_count: number;
  unit: string | null;
  archived_at: string | null;
  sort_order: number;
  created_at: string;
};

export type HabitInput = {
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
  weekdays: number[];
  reminderMinutes: number | null;
  targetCount: number;
  unit: string | null;
};

/** True when the habit counts repetitions rather than a single tick. */
export function isCounter(habit: Habit): boolean {
  return habit.targetCount > 1;
}

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    frequency: row.frequency,
    weekdays: parseWeekdays(row.weekdays),
    reminderMinutes: row.reminder_minutes,
    targetCount: row.target_count ?? 1,
    unit: row.unit,
    archivedAt: row.archived_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function parseWeekdays(raw: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

export function serializeWeekdays(days: number[]): string {
  return [...new Set(days)].sort((a, b) => a - b).join(',');
}

/** Whether a habit is scheduled to happen on a given weekday. */
export function isScheduledOn(habit: Habit, weekday: number): boolean {
  if (habit.frequency === 'daily') return true;
  return habit.weekdays.includes(weekday);
}
