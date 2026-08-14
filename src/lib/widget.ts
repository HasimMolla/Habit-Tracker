import { listHabits, allCompletionDays } from '@/db/habits';
import { isScheduledOn } from '@/db/schema';
import { addDays, todayKey, weekdayOf, type DayKey } from '@/lib/dates';
import TallyWidget from '../../modules/tally-widget';

/** Weeks of history the home screen widget renders. */
const WIDGET_WEEKS = 15;

export type WidgetHabit = {
  id: number;
  name: string;
  color: string;
  /** One character per day, oldest first: '2' done, '1' scheduled+missed, '0' not scheduled. */
  cells: string;
  streak: number;
  doneToday: boolean;
};

export type WidgetPayload = {
  updatedAt: number;
  weeks: number;
  /** Weekday index (0 = Sunday) of the most recent column. */
  todayWeekday: number;
  doneToday: number;
  totalToday: number;
  habits: WidgetHabit[];
};

/**
 * Builds the widget snapshot and hands it to the native module, which persists
 * it and asks Glance to redraw. Called on every mutation, so the home screen
 * never lags behind the app.
 *
 * Failures here are deliberately swallowed: a widget that can't update must
 * never take down the screen the user is looking at.
 */
export async function syncWidget(): Promise<void> {
  try {
    const payload = await buildPayload();
    await TallyWidget.setData(JSON.stringify(payload));
  } catch {
    // No-op — see above.
  }
}

export async function buildPayload(): Promise<WidgetPayload> {
  const [habits, completions] = await Promise.all([listHabits(), allCompletionDays()]);
  const today = todayKey();
  const todayWeekday = weekdayOf(today);

  // Same geometry as the in-app HeatGraph: whole weeks, Sunday-first, ending
  // on today's column.
  const start = addDays(today, -(todayWeekday + (WIDGET_WEEKS - 1) * 7));
  const totalDays = (WIDGET_WEEKS - 1) * 7 + todayWeekday + 1;

  const widgetHabits: WidgetHabit[] = habits.map((habit) => {
    const done = completions.get(habit.id) ?? new Set<DayKey>();
    let cells = '';

    for (let i = 0; i < totalDays; i++) {
      const day = addDays(start, i);
      if (done.has(day)) cells += '2';
      else if (isScheduledOn(habit, weekdayOf(day))) cells += '1';
      else cells += '0';
    }

    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      cells,
      streak: trailingStreak(cells),
      doneToday: done.has(today),
    };
  });

  const scheduledToday = habits.filter((habit) => isScheduledOn(habit, todayWeekday));

  return {
    updatedAt: Date.now(),
    weeks: WIDGET_WEEKS,
    todayWeekday,
    doneToday: scheduledToday.filter((habit) => completions.get(habit.id)?.has(today)).length,
    totalToday: scheduledToday.length,
    habits: widgetHabits,
  };
}

/**
 * Streak read off the encoded cell string: walk back over scheduled days,
 * skipping unscheduled ones, treating an unfinished today as a grace day.
 */
function trailingStreak(cells: string): number {
  let index = cells.length - 1;
  if (cells[index] === '1') index -= 1;

  let streak = 0;
  for (; index >= 0; index--) {
    const cell = cells[index];
    if (cell === '0') continue;
    if (cell === '1') break;
    streak += 1;
  }
  return streak;
}

export type PendingWidgetAction = {
  habitId: number;
  day: DayKey;
  complete: boolean;
  at: number;
};

/**
 * Taps the widget recorded while the app was closed.
 *
 * The widget cannot write to the database safely — it would mean a second
 * SQLite implementation sharing the same WAL — so it queues intent and the app
 * applies it here, on the next foreground.
 */
export async function drainPendingWidgetActions(): Promise<PendingWidgetAction[]> {
  try {
    const raw = await TallyWidget.drainPendingActions();
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is PendingWidgetAction =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PendingWidgetAction).habitId === 'number' &&
        typeof (entry as PendingWidgetAction).day === 'string'
    );
  } catch {
    return [];
  }
}
