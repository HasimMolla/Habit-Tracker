import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { hexToHsl, hslToHex, hueTrackColors } from '@/lib/color';
import { contrastOn, radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type CustomColorSheetProps = {
  visible: boolean;
  initial: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
};

const TRACK_HEIGHT = 34;
const THUMB = 26;
const HUE_COLORS = hueTrackColors();

/**
 * A bottom sheet for picking any colour: hue, then saturation, then lightness.
 *
 * Three plain sliders rather than a 2D area — they are far easier to hit
 * accurately on a phone, and each one maps to a word people already use
 * ("more orange", "more vivid", "lighter").
 */
export function CustomColorSheet({
  visible,
  initial,
  onCancel,
  onConfirm,
}: CustomColorSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [hsl, setHsl] = useState(() => hexToHsl(initial));

  useEffect(() => {
    if (visible) setHsl(hexToHsl(initial));
  }, [visible, initial]);

  const hex = hslToHex(hsl);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      {/* React Native's Modal renders into its own native window, which sits
          outside the root GestureHandlerRootView — without this, the sliders'
          pan gestures below never receive touches on Android. */}
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

          <Animated.View
            entering={SlideInDown.duration(260)}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceContainerHigh,
                paddingBottom: insets.bottom + spacing(5),
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.onSurface }]}>Custom colour</Text>
              <View style={[styles.preview, { backgroundColor: hex }]}>
                <Text style={[styles.previewHex, { color: contrastOn(hex) }]}>{hex}</Text>
              </View>
            </View>

            <Slider
              label="Hue"
              value={hsl.h / 360}
              onChange={(v) => setHsl((prev) => ({ ...prev, h: v * 360 }))}
              trackColors={HUE_COLORS}
              thumbColor={hslToHex({ h: hsl.h, s: 1, l: 0.5 })}
            />

            <Slider
              label="Saturation"
              value={hsl.s}
              onChange={(v) => setHsl((prev) => ({ ...prev, s: v }))}
              trackColors={[
                hslToHex({ h: hsl.h, s: 0, l: hsl.l }),
                hslToHex({ h: hsl.h, s: 1, l: hsl.l }),
              ]}
              thumbColor={hex}
            />

            <Slider
              label="Lightness"
              value={hsl.l}
              onChange={(v) => setHsl((prev) => ({ ...prev, l: v }))}
              trackColors={[
                '#000000',
                hslToHex({ h: hsl.h, s: hsl.s, l: 0.5 }),
                '#FFFFFF',
              ]}
              thumbColor={hex}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.surfaceContainerHighest, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.success();
                  onConfirm(hex);
                }}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: hex, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon name="check" size={19} color={contrastOn(hex)} />
                <Text style={[styles.buttonLabel, { color: contrastOn(hex) }]}>Use colour</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Slider({
  label,
  value,
  onChange,
  trackColors,
  thumbColor,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  trackColors: string[];
  thumbColor: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(0);

  useEffect(() => {
    if (width > 0) position.value = value * width;
  }, [value, width, position]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      const next = Math.min(Math.max(event.x, 0), width);
      position.value = next;
      if (width > 0) runOnJS(onChange)(next / width);
    })
    .onUpdate((event) => {
      const next = Math.min(Math.max(event.x, 0), width);
      position.value = next;
      if (width > 0) runOnJS(onChange)(next / width);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - THUMB / 2 }],
  }));

  return (
    <View style={styles.sliderBlock}>
      <Text style={[styles.sliderLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>

      <GestureDetector gesture={pan}>
        <View
          style={styles.trackWrap}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          <LinearGradient
            colors={trackColors as [string, string, ...string[]]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.track}
          />
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: thumbColor, borderColor: colors.surface },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000088',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2.5),
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    marginBottom: spacing(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(5),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  preview: {
    paddingHorizontal: spacing(3.5),
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHex: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sliderBlock: {
    marginBottom: spacing(4.5),
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing(2),
  },
  trackWrap: {
    height: THUMB + 12,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    borderWidth: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(1),
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing(2),
    height: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
