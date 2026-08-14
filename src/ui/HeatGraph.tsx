import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme, spacing } from '@/theme/theme';
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addDays,
  fromDayKey,
  todayKey,
  weekdayOf,
  type DayKey,
} from '@/lib/dates';

type HeatGraphProps = {
  /** Days the habit was completed. */
  completed: Set<DayKey>;
  /** Weekdays the habit is scheduled on (0 = Sunday). */
  scheduledWeekdays: number[];
  color: string;
  /** How many weeks of history to show. */
  weeks?: number;
  showLabels?: boolean;
  /**
   * Whether the grid scrolls horizontally. The weekday gutter stays pinned
   * outside the scroll area either way.
   */
  scrollable?: boolean;
  /**
   * When provided, each past day becomes tappable — this is how history gets
   * backfilled. Future days stay inert.
   */
  onDayPress?: (day: DayKey) => void;
};

const CELL = 13;
const GAP = 3;
const LABEL_GUTTER = 22;
const MONTH_ROW_HEIGHT = 13;
/** Columns that must pass before another month label may appear. */
const MIN_LABEL_GAP = 3;

/**
 * A GitHub-style consistency graph. Columns are weeks (oldest on the left),
 * rows are weekdays starting Sunday. Cells are tinted with the habit's own
 * colour: filled when completed, a faint wash when the day was scheduled but
 * missed, and neutral when the habit wasn't scheduled at all.
 */
export function HeatGraph({
  completed,
  scheduledWeekdays,
  color,
  weeks = 18,
  showLabels = true,
  scrollable = false,
  onDayPress,
}: HeatGraphProps) {
  const { colors, tint } = useTheme();
  const scroller = useRef<ScrollView>(null);

  const columns = useMemo(() => buildColumns(weeks), [weeks]);
  const scheduled = useMemo(() => new Set(scheduledWeekdays), [scheduledWeekdays]);

  const grid = (
    <View>
      {showLabels ? <MonthRow columns={columns} /> : null}

      <View style={styles.grid}>
        {columns.map((column, columnIndex) => (
          <View key={columnIndex} style={styles.column}>
            {column.days.map((day, rowIndex) => {
              if (!day) return <View key={rowIndex} style={styles.cell} />;

              const isScheduled = scheduled.has(weekdayOf(day));
              const isDone = completed.has(day);
              const cellStyle = [
                styles.cell,
                {
                  backgroundColor: isDone
                    ? color
                    : isScheduled
                      ? tint(color)
                      : colors.surfaceVariant,
                  opacity: isDone || isScheduled ? 1 : 0.4,
                },
              ];

              if (!onDayPress) return <View key={rowIndex} style={cellStyle} />;

              return (
                <Pressable
                  key={rowIndex}
                  accessibilityRole="button"
                  accessibilityLabel={`${day}${isDone ? ', done' : ''}`}
                  accessibilityState={{ selected: isDone }}
                  hitSlop={2}
                  onPress={() => onDayPress(day)}
                  style={({ pressed }) => [cellStyle, pressed && styles.cellPressed]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.body}>
      {/* Pinned outside the scroll area — inside it, the gutter would slide
          away the moment the grid scrolls to the most recent week. */}
      {showLabels ? (
        <View style={[styles.weekdayColumn, { paddingTop: MONTH_ROW_HEIGHT + spacing(1) }]}>
          {[1, 3, 5].map((row) => (
            <Text
              key={row}
              style={[
                styles.weekdayLabel,
                { color: colors.onSurfaceVariant, top: row * (CELL + GAP) + MONTH_ROW_HEIGHT + spacing(1) },
              ]}
            >
              {WEEKDAY_LABELS[row]}
            </Text>
          ))}
        </View>
      ) : null}

      {scrollable ? (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          // The most recent weeks matter most, so open at the right edge. This
          // fires once content is measured; a ref callback runs before layout.
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
    </View>
  );
}

function MonthRow({ columns }: { columns: Column[] }) {
  const { colors } = useTheme();

  // Label a column when its first day starts a new month, but never twice in
  // quick succession — a graph beginning late in a month would otherwise print
  // two labels side by side and they would collide.
  const labels = useMemo(() => {
    const out: { text: string; column: number }[] = [];
    let lastMonth = -1;
    let lastLabelled = -MIN_LABEL_GAP;

    columns.forEach((column, index) => {
      const first = column.days.find(Boolean);
      if (!first) return;

      const month = fromDayKey(first).getMonth();
      if (month === lastMonth) return;
      lastMonth = month;

      if (index - lastLabelled < MIN_LABEL_GAP) return;
      lastLabelled = index;
      out.push({ text: MONTH_LABELS[month], column: index });
    });
    return out;
  }, [columns]);

  return (
    <View style={styles.monthRow}>
      {labels.map((label) => (
        // Absolutely positioned so a three-character month can overflow its
        // 16pt column without wrapping or shifting the grid.
        <Text
          key={label.column}
          numberOfLines={1}
          style={[
            styles.monthLabel,
            { color: colors.onSurfaceVariant, left: label.column * (CELL + GAP) },
          ]}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}

type Column = { days: (DayKey | null)[] };

/**
 * Builds week-columns ending with today. The final column is padded with nulls
 * for days that haven't happened yet, so today always sits on its real weekday
 * row instead of the graph shifting each day.
 */
function buildColumns(weeks: number): Column[] {
  const today = todayKey();
  const todayWeekday = weekdayOf(today);

  // Walk back to the Sunday that opens the earliest visible week.
  const start = addDays(today, -(todayWeekday + (weeks - 1) * 7));
  const lastIndex = (weeks - 1) * 7 + todayWeekday;

  const columns: Column[] = [];
  for (let w = 0; w < weeks; w++) {
    const days: (DayKey | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const offset = w * 7 + d;
      days.push(offset > lastIndex ? null : addDays(start, offset));
    }
    columns.push({ days });
  }
  return columns;
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
  },
  column: {
    marginRight: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    marginBottom: GAP,
  },
  cellPressed: {
    transform: [{ scale: 0.82 }],
  },
  weekdayColumn: {
    width: LABEL_GUTTER,
  },
  weekdayLabel: {
    position: 'absolute',
    // An absolutely positioned Text collapses to zero width and clips its
    // glyph, so the box is stated explicitly.
    left: 0,
    width: LABEL_GUTTER - 4,
    fontSize: 9,
    lineHeight: CELL,
  },
  monthRow: {
    height: MONTH_ROW_HEIGHT,
    marginBottom: spacing(1),
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    fontSize: 9.5,
    lineHeight: MONTH_ROW_HEIGHT,
    fontWeight: '500',
  },
});
