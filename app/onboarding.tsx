import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';

import { Icon } from '@/ui/Icon';
import { HeatGraph } from '@/ui/HeatGraph';
import { useOnboarding } from '@/state/OnboardingProvider';
import { useProfile } from '@/state/ProfileProvider';
import { requestPermission } from '@/lib/notifications';
import { addDays, todayKey } from '@/lib/dates';
import { HABIT_COLORS, radius, spacing, useTheme } from '@/theme/theme';
import * as haptics from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Page = {
  icon: AndroidSymbol;
  title: string;
  body: string;
  accent: string;
  /** The final page collects the user's name instead of showing artwork. */
  askName?: boolean;
};

const PAGES: Page[] = [
  {
    icon: 'check_circle',
    title: 'One tap a day',
    body: 'Add the handful of things you want to do consistently, then tick them off as you go.',
    accent: HABIT_COLORS[0],
  },
  {
    icon: 'local_fire_department',
    title: 'Watch it add up',
    body: 'Every completed day builds a streak and fills in your consistency graph.',
    accent: HABIT_COLORS[6],
  },
  {
    icon: 'notifications',
    title: 'A nudge when it helps',
    body: 'Set an optional reminder for each habit. Everything stays on your device.',
    accent: HABIT_COLORS[3],
  },
  {
    icon: 'waving_hand',
    title: 'What should we call you?',
    body: 'Just so Tally can greet you properly. Leave it blank if you would rather not.',
    accent: HABIT_COLORS[8],
    askName: true,
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const { save: saveName } = useProfile();

  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');

  const isLast = page === PAGES.length - 1;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) {
      setPage(next);
      haptics.selection();
    }
  };

  const handlePrimary = async () => {
    haptics.selection();

    if (!isLast) {
      scrollRef.current?.scrollTo({ x: (page + 1) * SCREEN_WIDTH, animated: true });
      return;
    }

    // Asking here, in context, converts far better than a cold prompt later —
    // and declining is fine, Settings can grant it any time.
    await requestPermission().catch(() => {});
    if (name.trim()) await saveName(name);
    await complete();
    router.replace('/');
  };

  const handleSkip = async () => {
    haptics.selection();
    await complete();
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pager}
      >
        {PAGES.map((item, index) => (
          <PageView
            key={item.title}
            page={item}
            index={index}
            insetTop={insets.top}
            name={name}
            onChangeName={setName}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(5) }]}>
        <View style={styles.dots}>
          {PAGES.map((item, index) => (
            <Dot key={item.title} active={index === page} color={colors.primary} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handlePrimary}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>
            {isLast ? (name.trim() ? `Let's go, ${name.trim().split(' ')[0]}` : 'Get started') : 'Next'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleSkip}
          style={styles.skip}
          hitSlop={8}
        >
          <Text style={[styles.skipLabel, { color: colors.onSurfaceVariant }]}>
            {isLast ? 'Not now' : 'Skip'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function PageView({
  page,
  index,
  insetTop,
  name,
  onChangeName,
}: {
  page: Page;
  index: number;
  insetTop: number;
  name: string;
  onChangeName: (value: string) => void;
}) {
  const { colors, tint } = useTheme();

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, paddingTop: insetTop + spacing(10) }]}>
      <Animated.View
        entering={FadeIn.duration(420).delay(index === 0 ? 120 : 0)}
        style={[
          styles.art,
          // The name page trades artwork size for room to type.
          page.askName && styles.artCompact,
          { backgroundColor: tint(page.accent) },
        ]}
      >
        {index === 1 ? (
          <SampleGraph color={page.accent} />
        ) : (
          <Icon name={page.icon} size={page.askName ? 44 : 56} color={page.accent} />
        )}
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.duration(420).delay(160)}
        style={[styles.title, { color: colors.onBackground }]}
      >
        {page.title}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.duration(420).delay(240)}
        style={[styles.body, { color: colors.onSurfaceVariant }]}
      >
        {page.body}
      </Animated.Text>

      {page.askName ? (
        <Animated.View entering={FadeInDown.duration(420).delay(320)} style={styles.nameWrap}>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Your name"
            placeholderTextColor={colors.onSurfaceVariant}
            maxLength={24}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.surfaceContainer,
                color: colors.onSurface,
                borderColor: name.trim() ? page.accent : 'transparent',
              },
            ]}
          />
        </Animated.View>
      ) : null}

      {page.askName ? (
        <Animated.View entering={FadeInDown.duration(420).delay(320)} style={styles.nameWrap}>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Your name"
            placeholderTextColor={colors.onSurfaceVariant}
            maxLength={24}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.surfaceContainer,
                color: colors.onSurface,
                borderColor: name.trim() ? page.accent : 'transparent',
              },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A small, believable graph so the second page shows the real thing. */
function SampleGraph({ color }: { color: string }) {
  const completed = useRef(buildSampleDays()).current;
  return (
    <HeatGraph
      completed={completed}
      scheduledWeekdays={[0, 1, 2, 3, 4, 5, 6]}
      color={color}
      weeks={9}
      showLabels={false}
    />
  );
}

function buildSampleDays(): Set<string> {
  const today = todayKey();
  const days = new Set<string>();
  // A fixed pattern — dense recently, patchier further back.
  const pattern = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1];
  for (let i = 0; i < 63; i++) {
    if (pattern[i % pattern.length] === 1) days.add(addDays(today, -i));
  }
  return days;
}

function Dot({ active, color }: { active: boolean; color: string }) {
  const { colors } = useTheme();
  const width = useSharedValue(active ? 22 : 7);

  useEffect(() => {
    width.value = withSpring(active ? 22 : 7, { damping: 16, stiffness: 220 });
  }, [active, width]);

  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: active ? color : colors.outlineVariant },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1 },
  page: {
    alignItems: 'center',
    paddingHorizontal: spacing(9),
  },
  artCompact: {
    width: 132,
    height: 132,
    marginBottom: spacing(7),
  },
  nameWrap: {
    width: '100%',
    marginTop: spacing(6),
  },
  nameInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing(4),
    fontSize: 17,
    textAlign: 'center',
  },
  art: {
    width: 220,
    height: 220,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(10),
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  body: {
    marginTop: spacing(3),
    fontSize: 15.5,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing(7),
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginBottom: spacing(6),
  },
  dot: {
    height: 7,
    borderRadius: radius.full,
  },
  primary: {
    width: '100%',
    height: 54,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  skip: {
    marginTop: spacing(4),
    paddingVertical: spacing(1),
  },
  skipLabel: {
    fontSize: 14,
  },
});
