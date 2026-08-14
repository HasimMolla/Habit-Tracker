import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';
import { radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type StepperProps = {
  value: number;
  min?: number;
  max?: number;
  color: string;
  onChange: (value: number) => void;
};

/** Minus / value / plus. Used for a counter habit's daily target. */
export function Stepper({ value, min = 0, max = 99, color, onChange }: StepperProps) {
  const { colors } = useTheme();

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) {
      haptics.warning();
      return;
    }
    haptics.selection();
    onChange(next);
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerHigh }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        onPress={() => step(-1)}
        hitSlop={6}
        style={styles.button}
      >
        <Icon
          name="remove"
          size={19}
          color={value <= min ? colors.outlineVariant : colors.onSurface}
        />
      </Pressable>

      <Text style={[styles.value, { color: colors.onSurface }]}>{value}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={() => step(1)}
        hitSlop={6}
        style={styles.button}
      >
        <Icon name="add" size={19} color={value >= max ? colors.outlineVariant : color} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    padding: spacing(1),
  },
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 15.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
