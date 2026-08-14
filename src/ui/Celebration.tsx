import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from './Icon';
import { radius, spacing, useTheme, withAlpha } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type CelebrationProps = {
  visible: boolean;
  /** Used to make the congratulation personal when we know it. */
  name?: string;
  onDone: () => void;
};

const RAY_COUNT = 8;

/**
 * The all-done moment. A ring draws itself, a check springs in, eight short
 * rays flick outwards, and the whole thing fades. It lasts under two seconds
 * and never blocks input — the reward is the punctuation, not an interruption.
 */
export function Celebration({ visible, name, onDone }: CelebrationProps) {
  const { colors } = useTheme();

  const ring = useSharedValue(0);
  const check = useSharedValue(0);
  const rays = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    haptics.celebrate();

    ring.value = 0;
    check.value = 0;
    rays.value = 0;

    ring.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    check.value = withDelay(180, withSpring(1, { damping: 11, stiffness: 190 }));
    rays.value = withDelay(
      260,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onDone)();
        })
      )
    );
    // `onDone` is intentionally excluded: re-running this on every parent
    // render would restart the animation mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + ring.value * 0.4 }],
    opacity: ring.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(280)}
      style={[styles.overlay, { backgroundColor: withAlpha(colors.scrim, 0.42) }]}
    >
      <View style={styles.stage}>
        {Array.from({ length: RAY_COUNT }).map((_, index) => (
          <Ray key={index} index={index} progress={rays} color={colors.primary} />
        ))}

        <Animated.View
          style={[styles.ring, { borderColor: colors.primary }, ringStyle]}
        />
        <Animated.View style={checkStyle}>
          <Icon name="check" size={44} color={colors.primary} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(320).duration(360)}>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          {name ? `Nice work, ${name}` : 'All done today'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Every habit ticked off.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function Ray({
  index,
  progress,
  color,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const angle = (index / RAY_COUNT) * Math.PI * 2;

  const style = useAnimatedStyle(() => {
    const distance = 44 + progress.value * 34;
    return {
      opacity: progress.value,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { rotate: `${angle}rad` },
        { scaleX: 0.4 + progress.value * 0.6 },
      ],
    };
  });

  return <Animated.View style={[styles.ray, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    margin: 32,
    borderRadius: radius.full,
    borderWidth: 2.5,
  },
  ray: {
    position: 'absolute',
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  title: {
    marginTop: spacing(4),
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing(1),
    fontSize: 14.5,
    textAlign: 'center',
  },
});
