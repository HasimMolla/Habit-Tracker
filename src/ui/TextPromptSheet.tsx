import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

type TextPromptSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  initial: string;
  maxLength?: number;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/**
 * A small bottom sheet for a single text value.
 *
 * React Native's `Alert.prompt` is iOS-only, so an Android app needs its own.
 */
export function TextPromptSheet({
  visible,
  title,
  description,
  placeholder,
  initial,
  maxLength = 40,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}: TextPromptSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
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

            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
            {description ? (
              <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
                {description}
              </Text>
            ) : null}

            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={maxLength}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => onConfirm(value)}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
              ]}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.success();
                  onConfirm(value);
                }}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>
                  {confirmLabel}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: spacing(1.5),
    fontSize: 13.5,
    lineHeight: 19,
  },
  input: {
    height: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    fontSize: 16,
    marginTop: spacing(4),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(4),
  },
  button: {
    flex: 1,
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
