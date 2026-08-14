import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  allCompletionDays,
  countsForDay,
  listHabits,
  setCompletionCount,
  toggleCompletion as toggleCompletionInDb,
} from '@/db/habits';
import { isScheduledOn, type Habit } from '@/db/schema';
import { todayKey, weekdayOf, type DayKey } from '@/lib/dates';
import { drainPendingWidgetActions, syncWidget } from '@/lib/widget';
import * as haptics from '@/lib/haptics';

type HabitsContextValue = {
  habits: Habit[];
  /** Completed days per habit id. */
  completions: Map<number, Set<DayKey>>;
  /** Today's raw count per habit id — partial progress for counter habits. */
  todayCounts: Map<number, number>;
  today: DayKey;
  loading: boolean;
  /** Habits scheduled for today, in display order. */
  todaysHabits: Habit[];
  doneToday: Set<number>;
  /** True the moment the last outstanding habit for today is ticked off. */
  justCompletedAll: boolean;
  acknowledgeCompletedAll: () => void;
  refresh: () => Promise<void>;
  toggle: (habitId: number, day?: DayKey) => Promise<void>;
  /** Set the raw count for a counter habit on a day. */
  setCount: (habitId: number, count: number, day?: DayKey) => Promise<void>;
  /** The most recent toggle, so the UI can offer an undo. */
  lastAction: { habitId: number; day: DayKey; nowComplete: boolean; at: number } | null;
  undoLast: () => Promise<void>;
  dismissUndo: () => void;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Map<number, Set<DayKey>>>(new Map());
  const [todayCounts, setTodayCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<DayKey>(todayKey);
  const [justCompletedAll, setJustCompletedAll] = useState(false);
  const [lastAction, setLastAction] =
    useState<{ habitId: number; day: DayKey; nowComplete: boolean; at: number } | null>(null);

  /** Tracks whether today was already finished, so we only celebrate the transition. */
  const wasAllDone = useRef<boolean | null>(null);
  /** Latest habits, readable from callbacks without widening their deps. */
  const habitsRef = useRef<Habit[]>([]);

  const refresh = useCallback(async () => {
    const day = todayKey();
    const [nextHabits, nextCompletions, nextCounts] = await Promise.all([
      listHabits(),
      allCompletionDays(),
      countsForDay(day),
    ]);
    setHabits(nextHabits);
    habitsRef.current = nextHabits;
    setCompletions(nextCompletions);
    setTodayCounts(nextCounts);
    setToday(todayKey());
    setLoading(false);
  }, []);

  /**
   * Applies anything the widget recorded while the app was closed, then
   * reloads. Runs on mount and on every return to the foreground, because a
   * widget tap is the one way data changes without the app running.
   */
  const applyPendingThenRefresh = useCallback(async () => {
    const pending = await drainPendingWidgetActions();

    for (const action of pending) {
      const target = habitsRef.current.find((entry) => entry.id === action.habitId);
      await setCompletionCount(
        action.habitId,
        action.day,
        action.complete ? Math.max(1, target?.targetCount ?? 1) : 0
      );
    }

    await refresh();
  }, [refresh]);

  useEffect(() => {
    applyPendingThenRefresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') applyPendingThenRefresh();
    });
    return () => subscription.remove();
  }, [applyPendingThenRefresh]);

  const todaysHabits = useMemo(
    () => habits.filter((habit) => isScheduledOn(habit, weekdayOf(today))),
    [habits, today]
  );

  const doneToday = useMemo(() => {
    const set = new Set<number>();
    for (const habit of todaysHabits) {
      if (completions.get(habit.id)?.has(today)) set.add(habit.id);
    }
    return set;
  }, [todaysHabits, completions, today]);

  // Detect the moment today goes from unfinished to finished.
  useEffect(() => {
    if (loading) return;
    const allDone = todaysHabits.length > 0 && doneToday.size === todaysHabits.length;

    if (wasAllDone.current === false && allDone) {
      setJustCompletedAll(true);
    }
    wasAllDone.current = allDone;
  }, [loading, todaysHabits, doneToday]);

  const applyToggle = useCallback(
    async (habitId: number, day: DayKey, target: number) => {
      const nowComplete = await toggleCompletionInDb(habitId, day, target);

      // Optimistic local update keeps the checkbox instant; the widget and the
      // authoritative reload follow behind it.
      setCompletions((prev) => {
        const next = new Map(prev);
        const days = new Set(next.get(habitId) ?? []);
        if (nowComplete) days.add(day);
        else days.delete(day);
        next.set(habitId, days);
        return next;
      });

      if (day === todayKey()) {
        setTodayCounts((prev) => {
          const next = new Map(prev);
          if (nowComplete) next.set(habitId, target);
          else next.delete(habitId);
          return next;
        });
      }

      return nowComplete;
    },
    []
  );

  const toggle = useCallback(
    async (habitId: number, day: DayKey = todayKey()) => {
      const target = habits.find((entry) => entry.id === habitId)?.targetCount ?? 1;
      const nowComplete = await applyToggle(habitId, day, target);

      if (nowComplete) haptics.complete();
      else haptics.uncomplete();

      setLastAction({ habitId, day, nowComplete, at: Date.now() });
    },
    [habits, applyToggle]
  );

  const setCount = useCallback(
    async (habitId: number, count: number, day: DayKey = todayKey()) => {
      const target = habits.find((entry) => entry.id === habitId)?.targetCount ?? 1;
      await setCompletionCount(habitId, day, count);

      if (count >= target) haptics.complete();
      else haptics.selection();

      setTodayCounts((prev) => {
        const next = new Map(prev);
        if (count <= 0) next.delete(habitId);
        else next.set(habitId, count);
        return next;
      });

      setCompletions((prev) => {
        const next = new Map(prev);
        const days = new Set(next.get(habitId) ?? []);
        if (count >= target) days.add(day);
        else days.delete(day);
        next.set(habitId, days);
        return next;
      });
    },
    [habits]
  );

  const undoLast = useCallback(async () => {
    if (!lastAction) return;
    const target = habits.find((entry) => entry.id === lastAction.habitId)?.targetCount ?? 1;
    await applyToggle(lastAction.habitId, lastAction.day, target);
    haptics.selection();
    setLastAction(null);
    // Undoing must not re-trigger the all-done celebration on the way back up.
    setJustCompletedAll(false);
  }, [lastAction, habits, applyToggle]);

  const dismissUndo = useCallback(() => setLastAction(null), []);

  const acknowledgeCompletedAll = useCallback(() => setJustCompletedAll(false), []);

  // Single source of truth for the home screen widget: any change to habits or
  // completions — from any screen — pushes a fresh snapshot. Callers elsewhere
  // never need to sync it themselves.
  useEffect(() => {
    if (!loading) syncWidget();
  }, [loading, habits, completions]);

  const value = useMemo<HabitsContextValue>(
    () => ({
      habits,
      completions,
      todayCounts,
      today,
      loading,
      todaysHabits,
      doneToday,
      justCompletedAll,
      acknowledgeCompletedAll,
      refresh,
      toggle,
      setCount,
      lastAction,
      undoLast,
      dismissUndo,
    }),
    [
      habits,
      completions,
      todayCounts,
      today,
      loading,
      todaysHabits,
      doneToday,
      justCompletedAll,
      acknowledgeCompletedAll,
      refresh,
      toggle,
      setCount,
      lastAction,
      undoLast,
      dismissUndo,
    ]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits(): HabitsContextValue {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits must be used inside <HabitsProvider>');
  }
  return context;
}

/** Completed days for one habit, never undefined. */
export function useHabitCompletions(habitId: number): Set<DayKey> {
  const { completions } = useHabits();
  return useMemo(() => completions.get(habitId) ?? new Set<DayKey>(), [completions, habitId]);
}
