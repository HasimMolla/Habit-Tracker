import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { AndroidSymbol } from 'expo-symbols';

import { Icon } from './Icon';
import { spacing, radius, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type EmptyStateProps = {
  icon: AndroidSymbol;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
};

/**
 * Every empty state in Tally has the same anatomy: a symbol, a title, one clear
 * line of explanation, and a call to action when there is something to do.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.container}>
      <View style={[styles.iconWell, { backgroundColor: colors.surfaceVariant }]}>
        <Icon name={icon} size={32} color={colors.onSurfaceVariant} />
      </View>

      <Text style={[styles.title, { color: colors.onBackground }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>{description}</Text>

      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.selection();
            action.onPress();
          }}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(9),
    paddingBottom: spacing(12),
  },
  iconWell: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(5),
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing(2),
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing(6),
    paddingHorizontal: spacing(6),
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
