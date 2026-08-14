import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import * as haptics from '@/lib/haptics';

type Identifiable = { id: number };

type DraggableListProps<T extends Identifiable> = {
  items: T[];
  itemHeight: number;
  renderItem: (item: T) => ReactNode;
  onReorder: (ids: number[]) => void;
};

const SPRING = { damping: 20, stiffness: 220, mass: 0.6 };
const LONG_PRESS_MS = 220;

/**
 * Long-press to pick a row up, drag to reorder. Rows slide out of the way live
 * and the new order is committed once, on release.
 *
 * Ordering lives in a shared value so the entire interaction runs on the UI
 * thread; React only hears about it when the gesture ends.
 */
export function DraggableList<T extends Identifiable>({
  items,
  itemHeight,
  renderItem,
  onReorder,
}: DraggableListProps<T>) {
  // habit id -> visual slot index
  const positions = useSharedValue<Record<number, number>>(buildPositions(items));
  const activeId = useSharedValue<number>(-1);

  useEffect(() => {
    positions.value = buildPositions(items);
  }, [items, positions]);

  return (
    <View style={[styles.container, { height: items.length * itemHeight }]}>
      {items.map((item) => (
        <DraggableRow
          key={item.id}
          id={item.id}
          count={items.length}
          itemHeight={itemHeight}
          positions={positions}
          activeId={activeId}
          onReorder={onReorder}
        >
          {renderItem(item)}
        </DraggableRow>
      ))}
    </View>
  );
}

function DraggableRow({
  id,
  count,
  itemHeight,
  positions,
  activeId,
  onReorder,
  children,
}: {
  id: number;
  count: number;
  itemHeight: number;
  positions: SharedValue<Record<number, number>>;
  activeId: SharedValue<number>;
  onReorder: (ids: number[]) => void;
  children: ReactNode;
}) {
  const top = useSharedValue((positions.value[id] ?? 0) * itemHeight);
  const lifted = useSharedValue(0);

  // Follow slot changes driven by whichever row is currently being dragged.
  useAnimatedReaction(
    () => positions.value[id],
    (slot, previous) => {
      if (slot == null || slot === previous) return;
      if (activeId.value === id) return;
      top.value = withSpring(slot * itemHeight, SPRING);
    }
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      activeId.value = id;
      lifted.value = withTiming(1, { duration: 140 });
      runOnJS(haptics.selection)();
    })
    .onUpdate((event) => {
      if (activeId.value !== id) return;

      const startSlot = positions.value[id] ?? 0;
      const nextTop = clamp(
        startSlot * itemHeight + event.translationY,
        0,
        (count - 1) * itemHeight
      );
      top.value = nextTop;

      const targetSlot = clamp(Math.round(nextTop / itemHeight), 0, count - 1);
      if (targetSlot !== startSlot) {
        positions.value = swapSlots(positions.value, id, targetSlot);
        runOnJS(haptics.selection)();
      }
    })
    .onEnd(() => {
      const slot = positions.value[id] ?? 0;
      top.value = withSpring(slot * itemHeight, SPRING);
      runOnJS(onReorder)(toOrderedIds(positions.value));
    })
    .onFinalize(() => {
      activeId.value = -1;
      lifted.value = withTiming(0, { duration: 180 });
    });

  const style = useAnimatedStyle(() => ({
    top: top.value,
    zIndex: lifted.value > 0 ? 10 : 0,
    elevation: lifted.value * 8,
    shadowOpacity: lifted.value * 0.28,
    transform: [{ scale: 1 + lifted.value * 0.03 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, { height: itemHeight }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

function buildPositions<T extends Identifiable>(items: T[]): Record<number, number> {
  const out: Record<number, number> = {};
  items.forEach((item, index) => {
    out[item.id] = index;
  });
  return out;
}

/** Moves `movingId` to `targetSlot`, shifting everything in between by one. */
function swapSlots(
  positions: Record<number, number>,
  movingId: number,
  targetSlot: number
): Record<number, number> {
  'worklet';
  const currentSlot = positions[movingId];
  const next: Record<number, number> = { ...positions };

  for (const key of Object.keys(next)) {
    const id = Number(key);
    const slot = next[id];
    if (id === movingId) {
      next[id] = targetSlot;
    } else if (currentSlot < targetSlot && slot > currentSlot && slot <= targetSlot) {
      next[id] = slot - 1;
    } else if (currentSlot > targetSlot && slot >= targetSlot && slot < currentSlot) {
      next[id] = slot + 1;
    }
  }
  return next;
}

function toOrderedIds(positions: Record<number, number>): number[] {
  'worklet';
  return Object.keys(positions)
    .map(Number)
    .sort((a, b) => positions[a] - positions[b]);
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
});
