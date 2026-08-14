import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from './Icon';
import { ICON_GROUPS } from '@/lib/icons';
import { radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type IconPickerProps = {
  value: string;
  color: string;
  onChange: (icon: string) => void;
};

/**
 * Category chips over a single grid.
 *
 * Showing all four groups stacked made the form several screens tall and
 * pushed colour, frequency and reminder below the fold. One category at a time
 * keeps the whole form reachable, and the chip row opens on whichever category
 * already contains the selected symbol.
 */
export function IconPicker({ value, color, onChange }: IconPickerProps) {
  const { colors, tint } = useTheme();

  const initialGroup = useMemo(() => {
    const index = ICON_GROUPS.findIndex((group) =>
      group.icons.some((entry) => entry.name === value)
    );
    return index === -1 ? 0 : index;
  }, [value]);

  const [active, setActive] = useState(initialGroup);
  const group = ICON_GROUPS[active];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {ICON_GROUPS.map((entry, index) => {
          const selected = index === active;
          return (
            <Pressable
              key={entry.title}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                setActive(index);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? tint(color, 'medium') : colors.surfaceContainerHigh,
                  borderColor: selected ? color : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: selected ? color : colors.onSurfaceVariant },
                ]}
              >
                {entry.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Animated.View
        // Keyed on the category so switching fades the new grid in.
        key={group.title}
        entering={FadeIn.duration(180)}
        style={[styles.group, { backgroundColor: colors.surfaceContainerLow }]}
      >
        {group.icons.map((entry) => {
          const selected = entry.name === value;
          return (
            <Pressable
              key={entry.name}
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                onChange(entry.name);
              }}
              style={styles.cellWrap}
            >
              <View
                style={[
                  styles.cell,
                  {
                    backgroundColor: selected
                      ? tint(color, 'medium')
                      : colors.surfaceContainerHigh,
                    borderColor: selected ? color : 'transparent',
                  },
                ]}
              >
                <Icon
                  name={entry.name}
                  size={23}
                  color={selected ? color : colors.onSurfaceVariant}
                />
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    gap: spacing(2),
    paddingBottom: spacing(3),
    paddingRight: spacing(2),
  },
  chip: {
    paddingHorizontal: spacing(4),
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.lg,
    padding: spacing(2),
  },
  cellWrap: {
    width: `${100 / 5}%`,
    padding: spacing(1),
  },
  cell: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
