import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme/theme';

type SnackbarProps = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** How long it stays before dismissing itself. */
  duration?: number;
};

/**
 * A brief message with one optional action, floating above the tab bar.
 *
 * Deliberately non-blocking: it never steals focus, and it disappears on its
 * own, so a mis-tap is recoverable without turning every completion into a
 * confirmation dialog.
 */
export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
}: SnackbarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + spacing(3) }]}
    >
      <View style={[styles.bar, { backgroundColor: colors.inverseSurface }]}>
        <Text numberOfLines={2} style={[styles.message, { color: colors.inverseOnSurface }]}>
          {message}
        </Text>

        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            hitSlop={8}
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.actionLabel, { color: colors.inversePrimary }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing(4),
    right: spacing(4),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    paddingLeft: spacing(4),
    paddingRight: spacing(2),
    paddingVertical: spacing(2),
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
  },
  action: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
