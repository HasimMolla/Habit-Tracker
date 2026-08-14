import { getDatabase } from './database';
import { serializeWeekdays, type Frequency } from './schema';
import { addDays, todayKey, weekdayOf, type DayKey } from '@/lib/dates';

type SeedSpec = {
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
  weekdays: number[];
  reminderMinutes: number | null;
  /** How many days of history to generate. */
  historyDays: number;
  /** Chance a scheduled day was completed, 0–1. */
  consistency: number;
};

const SEEDS: SeedSpec[] = [
  {
    name: 'Walk outside',
    icon: 'directions_walk',
    color: '#34C759',
    frequency: 'daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    reminderMinutes: 8 * 60,
    historyDays: 84,
    consistency: 0.82,
  },
  {
    name: 'Take medicine',
    icon: 'medication',
    color: '#FF3B30',
    frequency: 'daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    reminderMinutes: 21 * 60,
    historyDays: 84,
    consistency: 0.94,
  },
  {
    name: 'Read',
    icon: 'menu_book',
    color: '#007AFF',
    frequency: 'daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    reminderMinutes: 22 * 60,
    historyDays: 70,
    consistency: 0.65,
  },
  {
    name: 'Strength training',
    icon: 'fitness_center',
    color: '#FF9500',
    frequency: 'weekly',
    weekdays: [1, 3, 5],
    reminderMinutes: 18 * 60 + 30,
    historyDays: 84,
    consistency: 0.76,
  },
  {
    name: 'Drink water',
    icon: 'water_drop',
    color: '#00C7BE',
    frequency: 'daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    reminderMinutes: null,
    historyDays: 56,
    consistency: 0.88,
  },
];

/**
 * Deterministic PRNG so "Load sample data" produces the same believable
 * history every time rather than a different graph on each tap.
 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

/**
 * Seeds several weeks of realistic history. Completion probability drifts in
 * slow waves so the heat graph shows good and bad stretches instead of noise,
 * and each habit finishes with a clean recent streak.
 */
export async function loadSampleData(): Promise<number> {
  const db = await getDatabase();
  const today = todayKey();
  let inserted = 0;

  await db.withTransactionAsync(async () => {
    for (let s = 0; s < SEEDS.length; s++) {
      const spec = SEEDS[s];
      const start = addDays(today, -spec.historyDays);

      const result = await db.runAsync(
        `INSERT INTO habits (name, icon, color, frequency, weekdays, reminder_minutes, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        spec.name,
        spec.icon,
        spec.color,
        spec.frequency,
        serializeWeekdays(spec.weekdays),
        spec.reminderMinutes,
        s,
        start
      );
      const habitId = result.lastInsertRowId;
      const random = makeRandom((s + 1) * 977);

      for (let i = 0; i <= spec.historyDays; i++) {
        const day: DayKey = addDays(start, i);
        const isScheduled =
          spec.frequency === 'daily' || spec.weekdays.includes(weekdayOf(day));
        if (!isScheduled) continue;

        // Slow sine wave => believable good weeks and bad weeks.
        const wave = Math.sin((i / spec.historyDays) * Math.PI * 3) * 0.18;
        // Ramp up slightly over time, as a real habit would bed in.
        const ramp = (i / spec.historyDays) * 0.1;
        const daysAgo = spec.historyDays - i;
        // Guarantee a satisfying streak over the last few days.
        const threshold = daysAgo <= 4 ? 0 : 1 - (spec.consistency + wave + ramp);

        if (random() >= threshold) {
          await db.runAsync(
            'INSERT OR IGNORE INTO completions (habit_id, day, completed_at) VALUES (?, ?, ?)',
            habitId,
            day,
            Date.now()
          );
          inserted += 1;
        }
      }
    }
  });

  return inserted;
}

export async function hasAnyHabits(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM habits');
  return (row?.count ?? 0) > 0;
}
