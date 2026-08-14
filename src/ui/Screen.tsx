import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { spacing, useTheme } from '@/theme/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

/** The large title block every top-level tab opens with. */
export function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(340).springify().damping(18)}
      style={[styles.header, { paddingTop: insets.top + spacing(3) }]}
    >
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.onBackground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </Animated.View>
  );
}

export function Section({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

export const SCREEN_PADDING = spacing(5);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing(4),
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: spacing(1),
    fontSize: 14.5,
  },
  section: {
    marginTop: spacing(6),
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: spacing(2.5),
    paddingHorizontal: SCREEN_PADDING,
  },
});
