import type { AndroidSymbol } from 'expo-symbols';

export type IconEntry = { name: AndroidSymbol; label: string };
export type IconGroup = { title: string; icons: IconEntry[] };

/**
 * Habit symbols, grouped by what the habit is *for*. Grouping beats one long
 * grid: people arrive knowing the category they want, and ten per section keeps
 * every group to a tidy two rows of five... six, at the widths we use.
 */
export const ICON_GROUPS: IconGroup[] = [
  {
    title: 'Move',
    icons: [
      { name: 'directions_walk', label: 'Walk' },
      { name: 'directions_run', label: 'Run' },
      { name: 'fitness_center', label: 'Gym' },
      { name: 'exercise', label: 'Workout' },
      { name: 'directions_bike', label: 'Cycle' },
      { name: 'self_improvement', label: 'Meditate' },
      { name: 'sports_gymnastics', label: 'Stretch' },
      { name: 'local_fire_department', label: 'Cardio' },
      { name: 'favorite', label: 'Heart' },
      { name: 'sports_tennis', label: 'Sport' },
    ],
  },
  {
    title: 'Health',
    icons: [
      { name: 'medication', label: 'Medicine' },
      { name: 'water_drop', label: 'Water' },
      { name: 'restaurant', label: 'Eat well' },
      { name: 'nutrition', label: 'Fruit' },
      { name: 'local_cafe', label: 'Coffee' },
      { name: 'king_bed', label: 'Sleep' },
      { name: 'alarm', label: 'Wake early' },
      { name: 'medical_services', label: 'Care' },
      { name: 'pulmonology', label: 'Breathe' },
      { name: 'visibility', label: 'Screen break' },
    ],
  },
  {
    title: 'Growth',
    icons: [
      { name: 'menu_book', label: 'Read' },
      { name: 'edit', label: 'Journal' },
      { name: 'psychology', label: 'Think' },
      { name: 'laptop_mac', label: 'Code' },
      { name: 'desktop_windows', label: 'Deep work' },
      { name: 'language', label: 'Language' },
      { name: 'attach_money', label: 'Save' },
      { name: 'trending_up', label: 'Invest' },
      { name: 'lightbulb', label: 'Ideas' },
      { name: 'school', label: 'Study' },
    ],
  },
  {
    title: 'Life',
    icons: [
      { name: 'music_note', label: 'Music' },
      { name: 'brush', label: 'Create' },
      { name: 'eco', label: 'Garden' },
      { name: 'sunny', label: 'Outdoors' },
      { name: 'dark_mode', label: 'Wind down' },
      { name: 'forum', label: 'Connect' },
      { name: 'photo_camera', label: 'Photo' },
      { name: 'home', label: 'Tidy' },
      { name: 'pets', label: 'Pets' },
      { name: 'sports_esports', label: 'Play' },
    ],
  },
];

/** Flat list, for lookups by name. */
export const HABIT_ICONS: IconEntry[] = ICON_GROUPS.flatMap((group) => group.icons);

export const DEFAULT_ICON: AndroidSymbol = 'directions_walk';
