import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { HabitForm } from '@/ui/HabitForm';
import { useHabits } from '@/state/HabitsProvider';
import { deleteHabit, getHabit, updateHabit } from '@/db/habits';
import type { HabitInput } from '@/db/schema';
import { rescheduleAll } from '@/lib/notifications';
import * as haptics from '@/lib/haptics';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Number(id);
  const { refresh } = useHabits();

  const [initial, setInitial] = useState<HabitInput | null>(null);

  useEffect(() => {
    if (!Number.isFinite(habitId)) {
      router.back();
      return;
    }
    getHabit(habitId).then((habit) => {
      if (!habit) {
        router.back();
        return;
      }
      setInitial({
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        weekdays: habit.weekdays,
        reminderMinutes: habit.reminderMinutes,
        targetCount: habit.targetCount,
        unit: habit.unit,
      });
    });
  }, [habitId]);

  const handleSubmit = async (input: HabitInput) => {
    await updateHabit(habitId, input);
    await refresh();
    router.back();
    rescheduleAll().catch(() => {});
  };

  const handleDelete = () => {
    haptics.warning();
    Alert.alert('Delete habit?', 'This also removes all of its history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(habitId);
          await refresh();
          router.back();
          rescheduleAll().catch(() => {});
        },
      },
    ]);
  };

  // Hold an empty surface until the habit loads, so the form never flashes
  // default values before the real ones arrive.
  if (!initial) return <View style={{ flex: 1 }} />;

  return (
    <HabitForm
      title="Edit habit"
      initial={initial}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      onDelete={handleDelete}
    />
  );
}
