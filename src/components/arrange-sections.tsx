import { useEffect } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { PROFILE_SECTIONS, PUBLIC_SECTIONS, type SectionKey } from '@/lib/profile-layout';

// Every row is the same height so a drag can work out the new place from the distance moved.
const ROW_HEIGHT = 68;
const STEP = ROW_HEIGHT + Spacing.two;

type Positions = Record<string, number>;

type ArrangeSectionsProps = {
  order: SectionKey[];
  hidden: Set<SectionKey>;
  onReorder: (order: SectionKey[]) => void;
  onToggle: (key: SectionKey) => void;
  // Lets the screen stop scrolling while a row is being dragged.
  onDragging?: (dragging: boolean) => void;
};

function toPositions(order: SectionKey[]): Positions {
  return Object.fromEntries(order.map((key, index) => [key, index]));
}

// Hold the ≡ handle and drag a row to a new place; the others slide out of the way.
export function ArrangeSections({
  order,
  hidden,
  onReorder,
  onToggle,
  onDragging,
}: ArrangeSectionsProps) {
  const positions = useSharedValue<Positions>(toPositions(order));

  // Keep in step when the order changes from outside, e.g. "Reset to default".
  useEffect(() => {
    positions.set(toPositions(order));
  }, [order, positions]);

  function finish(final: Positions) {
    const next = [...order].sort((a, b) => final[a] - final[b]);
    if (next.some((key, index) => key !== order[index])) onReorder(next);
  }

  return (
    <View style={{ height: order.length * STEP - Spacing.two }}>
      {order.map((key, index) => (
        <DraggableRow
          key={key}
          sectionKey={key}
          startIndex={index}
          count={order.length}
          positions={positions}
          shown={!hidden.has(key)}
          onToggle={() => onToggle(key)}
          onFinish={finish}
          onDragging={onDragging}
        />
      ))}
    </View>
  );
}

type DraggableRowProps = {
  sectionKey: SectionKey;
  startIndex: number;
  count: number;
  positions: SharedValue<Positions>;
  shown: boolean;
  onToggle: () => void;
  onFinish: (positions: Positions) => void;
  onDragging?: (dragging: boolean) => void;
};

function DraggableRow({
  sectionKey,
  startIndex,
  count,
  positions,
  shown,
  onToggle,
  onFinish,
  onDragging,
}: DraggableRowProps) {
  const section = PROFILE_SECTIONS[sectionKey];
  const top = useSharedValue(startIndex * STEP);
  const startTop = useSharedValue(0);
  const active = useSharedValue(false);

  // Slide into place when another row takes this one's spot.
  useAnimatedReaction(
    () => positions.get()[sectionKey],
    (position, previous) => {
      if (position !== previous && !active.get()) top.set(withTiming(position * STEP));
    }
  );

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: () => {
      'worklet';
      if (onDragging) scheduleOnRN(onDragging, true);
    },
    onActivate: () => {
      'worklet';
      active.set(true);
      startTop.set(positions.get()[sectionKey] * STEP);
    },
    onUpdate: (event) => {
      'worklet';
      const y = Math.min(Math.max(startTop.get() + event.translationY, 0), (count - 1) * STEP);
      top.set(y);
      const current = positions.get();
      const from = current[sectionKey];
      const to = Math.round(y / STEP);
      if (to === from) return;
      // Rows between the old and new place shift one step to fill the gap, even on a fast drag.
      const next: Positions = {};
      for (const key of Object.keys(current)) {
        const position = current[key];
        if (to > from && position > from && position <= to) next[key] = position - 1;
        else if (to < from && position >= to && position < from) next[key] = position + 1;
        else next[key] = position;
      }
      next[sectionKey] = to;
      positions.set(next);
    },
    onFinalize: () => {
      'worklet';
      if (active.get()) {
        active.set(false);
        top.set(withTiming(positions.get()[sectionKey] * STEP));
        scheduleOnRN(onFinish, positions.get());
      }
      if (onDragging) scheduleOnRN(onDragging, false);
    },
  });

  const style = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: active.get() ? 10 : 0,
    transform: [{ scale: withTiming(active.get() ? 1.03 : 1, { duration: 120 }) }],
    shadowOpacity: withTiming(active.get() ? 0.3 : 0, { duration: 120 }),
  }));

  return (
    <Animated.View style={[styles.slot, style]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <GestureDetector gesture={pan}>
          <View
            style={styles.handle}
            accessibilityLabel={`Drag to move ${section.label}`}
            accessibilityHint="Hold and drag up or down">
            <ThemedText style={styles.grip} themeColor="textSecondary">
              ≡
            </ThemedText>
          </View>
        </GestureDetector>
        <View style={[styles.grow, !shown && styles.faded]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {section.emoji} {section.label}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {!shown
              ? 'Hidden'
              : PUBLIC_SECTIONS.includes(sectionKey)
                ? 'Everyone sees this'
                : 'Only on your page'}
          </ThemedText>
        </View>
        <Switch
          value={shown}
          onValueChange={onToggle}
          trackColor={{ true: Brand.purple }}
          accessibilityLabel={`Show ${section.label}`}
        />
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Spacing.three,
  },
  // A big target for a thumb, so it's easy to grab.
  handle: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
  },
  grip: {
    fontSize: 24,
    lineHeight: 28,
  },
  grow: {
    flex: 1,
  },
  faded: {
    opacity: 0.5,
  },
});
