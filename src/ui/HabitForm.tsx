import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { Icon } from './Icon';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';
import { Stepper } from './Stepper';
import { SCREEN_PADDING } from './Screen';
import { DEFAULT_ICON } from '@/lib/icons';
import { WEEKDAY_LABELS, formatTime } from '@/lib/dates';
import type { Frequency, HabitInput } from '@/db/schema';
import { HABIT_COLORS, contrastOn, radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

/**
 * One-tap starters. Each fills name, icon and colour together, which is most
 * of the form — the fastest path from "add habit" to done.
 */
const HABIT_SUGGESTIONS = [
  { name: 'Walk outside', icon: 'directions_walk', color: '#34C759' },
  { name: 'Drink water', icon: 'water_drop', color: '#00C7BE' },
  { name: 'Read', icon: 'menu_book', color: '#007AFF' },
  { name: 'Take medicine', icon: 'medication', color: '#FF3B30' },
  { name: 'Meditate', icon: 'self_improvement', color: '#AF52DE' },
] as const;

type HabitFormProps = {
  title: string;
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function HabitForm({
  title,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: HabitFormProps) {
  const { colors, tint } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState<string>(initial?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initial?.color ?? HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.weekdays ?? [1, 2, 3, 4, 5]
  );
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(
    initial?.reminderMinutes ?? null
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [targetCount, setTargetCount] = useState(initial?.targetCount ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? '');

  const trimmed = name.trim();
  const weekdaysValid = frequency === 'daily' || weekdays.length > 0;
  const canSubmit = trimmed.length > 0 && weekdaysValid;

  const toggleWeekday = (day: number) => {
    haptics.selection();
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleTimeSelected = (_event: unknown, date: Date) => {
    setShowTimePicker(false);
    haptics.selection();
    setReminderMinutes(date.getHours() * 60 + date.getMinutes());
  };

  const submit = () => {
    if (!canSubmit) {
      haptics.warning();
      return;
    }
    haptics.success();
    onSubmit({
      name: trimmed,
      icon,
      color,
      frequency,
      weekdays,
      reminderMinutes,
      targetCount,
      unit: targetCount > 1 ? unit.trim() || null : null,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing(3) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onCancel}
          style={styles.headerButton}
        >
          <Icon name="close" size={24} color={colors.onSurfaceVariant} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>{title}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          onPress={submit}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: canSubmit ? colors.primary : colors.surfaceVariant,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.saveLabel,
              { color: canSubmit ? colors.onPrimary : colors.onSurfaceVariant },
            ]}
          >
            {submitLabel}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(10) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(240)}
          style={[styles.preview, { backgroundColor: tint(color) }]}
        >
          <View style={[styles.previewWell, { backgroundColor: color }]}>
            <Icon name={icon} size={28} color={contrastOn(color)} />
          </View>
          <Text numberOfLines={1} style={[styles.previewName, { color: colors.onBackground }]}>
            {trimmed || 'New habit'}
          </Text>
        </Animated.View>

        <Field label="Name">
          <View style={styles.inputRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="What do you want to do?"
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={40}
              returnKeyType="done"
              autoFocus={!initial}
              selectTextOnFocus
              style={[
                styles.input,
                { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
              ]}
            />
            {trimmed.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear name"
                onPress={() => setName('')}
                hitSlop={10}
                style={styles.clearButton}
              >
                <Icon name="cancel" size={19} color={colors.onSurfaceVariant} />
              </Pressable>
            ) : (
              <Text style={[styles.counter, { color: colors.onSurfaceVariant }]}>
                {40 - name.length}
              </Text>
            )}
          </View>

          {/* Starter suggestions only while the field is empty: they fill name,
              icon and colour in one tap, which is most of the form. */}
          {!initial && trimmed.length === 0 ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.suggestionRow}>
              {HABIT_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion.name}
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.selection();
                    setName(suggestion.name);
                    setIcon(suggestion.icon);
                    setColor(suggestion.color);
                  }}
                  style={[
                    styles.suggestion,
                    { backgroundColor: colors.surfaceContainerHigh },
                  ]}
                >
                  <Icon name={suggestion.icon} size={15} color={suggestion.color} />
                  <Text style={[styles.suggestionLabel, { color: colors.onSurface }]}>
                    {suggestion.name}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}
        </Field>

        <Field label="Icon">
          <IconPicker value={icon} color={color} onChange={setIcon} />
        </Field>

        <Field label="Colour">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        <Field label="Goal">
          <View style={[styles.goalRow, { backgroundColor: colors.surfaceContainer }]}>
            <View style={styles.goalText}>
              <Text style={[styles.goalValue, { color: colors.onSurface }]}>
                {targetCount === 1
                  ? 'Once a day'
                  : `${targetCount}${unit.trim() ? ` ${unit.trim()}` : '×'} a day`}
              </Text>
              <Text style={[styles.goalHint, { color: colors.onSurfaceVariant }]}>
                {targetCount === 1
                  ? 'A simple tick'
                  : 'Counts up — done when you reach the target'}
              </Text>
            </View>

            <Stepper
              value={targetCount}
              min={1}
              max={99}
              color={color}
              onChange={setTargetCount}
            />
          </View>

          {targetCount > 1 ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <TextInput
                value={unit}
                onChangeText={setUnit}
                placeholder="Unit — glasses, pages, reps…"
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={16}
                returnKeyType="done"
                style={[
                  styles.unitInput,
                  { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
                ]}
              />
            </Animated.View>
          ) : null}
        </Field>

        <Field label="Frequency">
          <View style={[styles.segmented, { backgroundColor: colors.surfaceContainer }]}>
            {(['daily', 'weekly'] as const).map((option) => {
              const selected = frequency === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.selection();
                    setFrequency(option);
                  }}
                  style={[
                    styles.segment,
                    selected && { backgroundColor: colors.secondaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      {
                        color: selected ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                        fontWeight: selected ? '600' : '500',
                      },
                    ]}
                  >
                    {option === 'daily' ? 'Every day' : 'Specific days'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {frequency === 'weekly' ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, day) => {
                const selected = weekdays.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => toggleWeekday(day)}
                    style={[
                      styles.weekday,
                      {
                        backgroundColor: selected ? color : colors.surfaceContainer,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayLabel,
                        { color: selected ? contrastOn(color) : colors.onSurfaceVariant },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}

          {!weekdaysValid ? (
            <Text style={[styles.validation, { color: colors.error }]}>
              Pick at least one day.
            </Text>
          ) : null}
        </Field>

        <Field label="Reminder">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.selection();
              setShowTimePicker(true);
            }}
            style={[styles.reminderRow, { backgroundColor: colors.surfaceContainer }]}
          >
            <Icon
              name={reminderMinutes == null ? 'notifications_off' : 'notifications'}
              size={20}
              color={reminderMinutes == null ? colors.onSurfaceVariant : color}
            />
            <Text style={[styles.reminderText, { color: colors.onSurface }]}>
              {reminderMinutes == null ? 'No reminder' : formatTime(reminderMinutes)}
            </Text>
            {reminderMinutes == null ? (
              <Text style={[styles.reminderHint, { color: colors.onSurfaceVariant }]}>Set</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear reminder"
                onPress={() => {
                  haptics.selection();
                  setReminderMinutes(null);
                }}
                hitSlop={10}
              >
                <Icon name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            )}
          </Pressable>
        </Field>

        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.errorContainer, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="delete" size={19} color={colors.onErrorContainer} />
            <Text style={[styles.deleteLabel, { color: colors.onErrorContainer }]}>
              Delete habit
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {showTimePicker ? (
        <DateTimePicker
          value={minutesToDate(reminderMinutes ?? 8 * 60)}
          mode="time"
          // 12-hour with an AM/PM toggle. The system default follows the
          // device's 24-hour setting, which reads as "21:30" to most people.
          is24Hour={false}
          accentColor={color}
          positiveButton={{ label: 'Set reminder' }}
          negativeButton={{ label: 'Cancel' }}
          onValueChange={handleTimeSelected}
          onDismiss={() => setShowTimePicker(false)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      {children}
    </View>
  );
}

function minutesToDate(minutes: number): Date {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  saveButton: {
    paddingHorizontal: spacing(4.5),
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(4),
    borderRadius: radius.lg,
    gap: spacing(3.5),
  },
  previewWell: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  field: {
    marginTop: spacing(6),
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: spacing(2.5),
  },
  inputRow: {
    justifyContent: 'center',
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    paddingLeft: spacing(4),
    paddingRight: spacing(12),
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: spacing(4),
  },
  counter: {
    position: 'absolute',
    right: spacing(4),
    fontSize: 12.5,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(3),
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    height: 34,
    borderRadius: radius.full,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingLeft: spacing(4),
    paddingRight: spacing(2),
  },
  goalText: {
    flex: 1,
    marginRight: spacing(3),
  },
  goalValue: {
    fontSize: 15.5,
    fontWeight: '500',
  },
  goalHint: {
    marginTop: spacing(0.5),
    fontSize: 12.5,
  },
  unitInput: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    fontSize: 15,
    marginTop: spacing(2.5),
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: spacing(1),
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: spacing(3),
    gap: spacing(1.5),
  },
  weekday: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  validation: {
    marginTop: spacing(2),
    fontSize: 12.5,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    gap: spacing(3),
  },
  reminderText: {
    flex: 1,
    fontSize: 15.5,
  },
  reminderHint: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(8),
    height: 50,
    borderRadius: radius.full,
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
