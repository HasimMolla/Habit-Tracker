import { router } from 'expo-router';

import { HabitForm } from '@/ui/HabitForm';
import { useHabits } from '@/state/HabitsProvider';
import { createHabit } from '@/db/habits';
import type { HabitInput } from '@/db/schema';
import { rescheduleAll } from '@/lib/notifications';

export default function NewHabitScreen() {
  const { refresh } = useHabits();

  const handleSubmit = async (input: HabitInput) => {
    await createHabit(input);
    await refresh();
    router.back();
    // Reminders catch up after the sheet has closed, so dismissal stays
    // instant. The widget is refreshed by HabitsProvider.
    rescheduleAll().catch(() => {});
  };

  return (
    <HabitForm
      title="New habit"
      submitLabel="Add"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
