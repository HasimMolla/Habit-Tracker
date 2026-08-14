import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from './Icon';
import { CustomColorSheet } from './CustomColorSheet';
import { HABIT_COLORS, contrastOn, radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Anything outside the preset palette is a custom colour, so the custom
  // swatch shows it and reads as selected.
  const isCustom = !HABIT_COLORS.includes(value as (typeof HABIT_COLORS)[number]);

  return (
    <View>
      <View style={styles.row}>
        {HABIT_COLORS.map((color) => (
          <Swatch
            key={color}
            color={color}
            selected={color === value}
            onPress={() => {
              haptics.selection();
              onChange(color);
            }}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Custom colour"
          accessibilityState={{ selected: isCustom }}
          onPress={() => {
            haptics.selection();
            setSheetOpen(true);
          }}
          style={styles.swatchWrap}
        >
          <View
            style={[
              styles.swatch,
              styles.customSwatch,
              {
                backgroundColor: isCustom ? value : colors.surfaceContainerHigh,
                borderColor: isCustom ? value : colors.outlineVariant,
              },
            ]}
          >
            <Icon
              name={isCustom ? 'check' : 'palette'}
              size={20}
              color={isCustom ? contrastOn(value) : colors.onSurfaceVariant}
            />
          </View>
        </Pressable>
      </View>

      <CustomColorSheet
        visible={sheetOpen}
        initial={value}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(hex) => {
          setSheetOpen(false);
          onChange(hex);
        }}
      />
    </View>
  );
}

function Swatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [selected, progress]);

  // The check sits inside the swatch rather than a ring around it: no extra
  // chrome, and the colour itself stays the largest thing on screen.
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.swatchWrap}
    >
      <View style={[styles.swatch, { backgroundColor: color }]}>
        <Animated.View style={checkStyle}>
          <Icon name="check" size={22} color={contrastOn(color)} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatchWrap: {
    width: `${100 / 6}%`,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSwatch: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
