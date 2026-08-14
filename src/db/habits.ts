import { getDatabase } from './database';
import {
  ALL_WEEKDAYS,
  rowToHabit,
  serializeWeekdays,
  type Habit,
  type HabitInput,
  type HabitRow,
} from './schema';
import { todayKey, type DayKey } from '@/lib/dates';

/** Active habits only. Archived ones keep their history but leave the lists. */
export async function listHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC'
  );
  return rows.map(rowToHabit);
}

export async function listArchivedHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE archived_at IS NOT NULL ORDER BY archived_at DESC'
  );
  return rows.map(rowToHabit);
}

export async function archiveHabit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE habits SET archived_at = ? WHERE id = ?', todayKey(), id);
}

export async function unarchiveHabit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE habits SET archived_at = NULL WHERE id = ?', id);
}

export async function getHabit(id: number): Promise<Habit | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', id);
  return row ? rowToHabit(row) : null;
}

export async function createHabit(input: HabitInput): Promise<number> {
  const db = await getDatabase();
  const next = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(sort_order) + 1 AS next FROM habits'
  );
  const weekdays = input.frequency === 'daily' ? ALL_WEEKDAYS : input.weekdays;

  const result = await db.runAsync(
    `INSERT INTO habits
       (name, icon, color, frequency, weekdays, reminder_minutes, target_count, unit, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name.trim(),
    input.icon,
    input.color,
    input.frequency,
    serializeWeekdays(weekdays),
    input.reminderMinutes,
    Math.max(1, input.targetCount),
    input.unit?.trim() || null,
    next?.next ?? 0,
    todayKey()
  );
  return result.lastInsertRowId;
}

export async function updateHabit(id: number, input: HabitInput): Promise<void> {
  const db = await getDatabase();
  const weekdays = input.frequency === 'daily' ? ALL_WEEKDAYS : input.weekdays;

  await db.runAsync(
    `UPDATE habits
        SET name = ?, icon = ?, color = ?, frequency = ?, weekdays = ?,
            reminder_minutes = ?, target_count = ?, unit = ?
      WHERE id = ?`,
    input.name.trim(),
    input.icon,
    input.color,
    input.frequency,
    serializeWeekdays(weekdays),
    input.reminderMinutes,
    Math.max(1, input.targetCount),
    input.unit?.trim() || null,
    id
  );
}

export async function deleteHabit(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM completions WHERE habit_id = ?', id);
  await db.runAsync('DELETE FROM habits WHERE id = ?', id);
}

/** Persists a new manual ordering. `ids` is the full list, in display order. */
export async function reorderHabits(ids: number[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync('UPDATE habits SET sort_order = ? WHERE id = ?', i, ids[i]);
    }
  });
}

export async function completionsForDay(day: DayKey): Promise<Set<number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ habit_id: number }>(
    'SELECT habit_id FROM completions WHERE day = ?',
    day
  );
  return new Set(rows.map((r) => r.habit_id));
}

/**
 * Toggles a habit's completion for a day. Returns the resulting state.
 *
 * For counter habits this jumps straight to the target or clears it — the
 * stepper is for incremental progress, this is the "done"/"not done" switch.
 */
export async function toggleCompletion(
  habitId: number,
  day: DayKey,
  targetCount = 1
): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM completions WHERE habit_id = ? AND day = ?',
    habitId,
    day
  );

  if (existing) {
    await db.runAsync('DELETE FROM completions WHERE id = ?', existing.id);
    return false;
  }

  await db.runAsync(
    'INSERT INTO completions (habit_id, day, completed_at, count) VALUES (?, ?, ?, ?)',
    habitId,
    day,
    Date.now(),
    Math.max(1, targetCount)
  );
  return true;
}

/**
 * Sets a counter habit's progress for a day. A count of zero removes the row
 * entirely, so "no progress" and "no record" stay the same thing.
 */
export async function setCompletionCount(
  habitId: number,
  day: DayKey,
  count: number
): Promise<void> {
  const db = await getDatabase();

  if (count <= 0) {
    await db.runAsync('DELETE FROM completions WHERE habit_id = ? AND day = ?', habitId, day);
    return;
  }

  await db.runAsync(
    `INSERT INTO completions (habit_id, day, completed_at, count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, day) DO UPDATE SET count = excluded.count`,
    habitId,
    day,
    Date.now(),
    count
  );
}

/** Today's progress for every habit, for counter habits' partial state. */
export async function countsForDay(day: DayKey): Promise<Map<number, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ habit_id: number; count: number }>(
    'SELECT habit_id, count FROM completions WHERE day = ?',
    day
  );
  return new Map(rows.map((row) => [row.habit_id, row.count]));
}

/** Raw per-day counts for one habit. */
export async function completionCounts(habitId: number): Promise<Map<DayKey, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string; count: number }>(
    'SELECT day, count FROM completions WHERE habit_id = ?',
    habitId
  );
  return new Map(rows.map((row) => [row.day, row.count]));
}

/** All completed day keys for a habit, ascending. */
export async function completionDays(habitId: number): Promise<DayKey[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT day FROM completions WHERE habit_id = ? ORDER BY day ASC',
    habitId
  );
  return rows.map((r) => r.day);
}

/**
 * Completed day keys for every habit, keyed by habit id.
 *
 * A counter habit only counts as done once its target is reached, so the
 * comparison happens in SQL rather than leaving partial days looking complete.
 */
export async function allCompletionDays(): Promise<Map<number, Set<DayKey>>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ habit_id: number; day: string }>(
    `SELECT c.habit_id, c.day
       FROM completions c
       JOIN habits h ON h.id = c.habit_id
      WHERE c.count >= h.target_count`
  );
  const map = new Map<number, Set<DayKey>>();
  for (const row of rows) {
    let set = map.get(row.habit_id);
    if (!set) {
      set = new Set();
      map.set(row.habit_id, set);
    }
    set.add(row.day);
  }
  return map;
}
