/**
 * All dates in Tally are stored as local calendar days in `YYYY-MM-DD` form.
 * Everything here works off the device's local timezone on purpose — a habit
 * completed at 11pm belongs to that day, not to the following UTC day.
 */

export type DayKey = string;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day key for a Date. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a day key back into a Date anchored at local midnight. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

/** Shifts a day key by a number of days (negative goes back). */
export function addDays(key: DayKey, delta: number): DayKey {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

/** Whole days between two keys (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  const msPerDay = 86400000;
  const diff = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(diff / msPerDay);
}

/** 0 = Sunday … 6 = Saturday, matching JS `getDay()`. */
export function weekdayOf(key: DayKey): number {
  return fromDayKey(key).getDay();
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "Thursday, 13 August" — used as the Today screen subtitle. */
export function formatLongDate(key: DayKey): string {
  const d = fromDayKey(key);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

/** Inclusive list of day keys from `start` to `end`. */
export function dayRange(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  let cursor = start;
  const total = daysBetween(start, end);
  for (let i = 0; i <= total; i++) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Formats minutes-from-midnight as "7:30 AM". */
export function formatTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/**
 * Time-of-day greeting. Boundaries are deliberately generous — "morning"
 * running to noon and "evening" from 5pm matches how people actually speak.
 */
export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
