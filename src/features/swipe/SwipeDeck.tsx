import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Candidate, LatLng, SwipeDir } from '../../core/types';
import { useTheme } from '../../theme';
import { SwipeCard } from './SwipeCard';
import { resolveSwipe } from './resolveSwipe';
import type { Deck } from './useDeck';

const SPRING = { damping: 18, stiffness: 160, mass: 0.8 } as const;
const EXIT_SPRING = { damping: 22, stiffness: 150, mass: 0.6, overshootClamping: true } as const;

type From = { x: number; y: number; vx: number; vy: number };
const CENTER: From = { x: 0, y: 0, vx: 0, vy: 0 };

/**
 * Optimistic deck: a swipe advances the deck IMMEDIATELY (the next card is interactive at
 * once, so you can swipe again without waiting) while the swiped card animates off in a
 * separate layer. Directions: right = like, left = pass, down = maybe.
 */
export function SwipeDeck({ deck, anchor }: { deck: Deck; anchor?: LatLng }) {
  const t = useTheme();
  const { current, next, like, pass, maybe } = deck;
  const [exits, setExits] = useState<{ key: string; card: Candidate; dir: SwipeDir; from: From }[]>([]);
  const seq = useRef(0);

  const doSwipe = useCallback(
    (card: Candidate, dir: SwipeDir, from: From) => {
      setExits((e) => [...e, { key: `${card.id}-${seq.current++}`, card, dir, from }]);
      if (dir === 'LIKE') like();
      else if (dir === 'PASS') pass();
      else maybe();
    },
    [like, pass, maybe],
  );
  const removeExit = useCallback((key: string) => setExits((e) => e.filter((x) => x.key !== key)), []);

  return (
    <View style={styles.root}>
      <View style={[styles.stack, { margin: t.space.xl }]}>
        {next && <DeckCard key={next.id} candidate={next} anchor={anchor} interactive={false} />}
        {current && (
          <DeckCard
            key={current.id}
            candidate={current}
            anchor={anchor}
            interactive
            onSwipe={(dir, from) => doSwipe(current, dir, from)}
          />
        )}
        {exits.map((x) => (
          <ExitingCard key={x.key} candidate={x.card} anchor={anchor} dir={x.dir} from={x.from} onDone={() => removeExit(x.key)} />
        ))}
      </View>
      <View style={styles.buttons}>
        <RoundButton label="✕" color={t.color.pass} accessibilityLabel="Pass" onPress={() => current && doSwipe(current, 'PASS', CENTER)} />
        <RoundButton label="?" color={t.color.textDim} size={54} accessibilityLabel="Maybe" onPress={() => current && doSwipe(current, 'MAYBE', CENTER)} />
        <RoundButton label="♥" color={t.color.like} accessibilityLabel="Like" onPress={() => current && doSwipe(current, 'LIKE', CENTER)} />
      </View>
    </View>
  );
}

/** A card in the stack. The top card (interactive) is draggable; the next card sits behind
 * it, statically, and is promoted in place (same instance → no photo refetch flicker). */
function DeckCard({
  candidate,
  anchor,
  interactive,
  onSwipe,
}: {
  candidate: Candidate;
  anchor?: LatLng;
  interactive: boolean;
  onSwipe?: (dir: SwipeDir, from: From) => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const threshold = width * 0.3;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      'worklet';
      tx.value = e.translationX;
      ty.value = Math.max(0, e.translationY); // only follow downward (for maybe)
    })
    .onEnd((e) => {
      'worklet';
      const dir = resolveSwipe(e.translationX, e.translationY, e.velocityX, e.velocityY, threshold);
      if (dir && onSwipe) {
        scheduleOnRN(onSwipe, dir, { x: tx.value, y: ty.value, vx: e.velocityX, vy: e.velocityY });
      } else {
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [0, threshold], [0, 1], Extrapolation.CLAMP) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-threshold, 0], [1, 0], Extrapolation.CLAMP) }));
  const maybeStyle = useAnimatedStyle(() => ({ opacity: interpolate(ty.value, [0, threshold], [0, 1], Extrapolation.CLAMP) }));

  if (!interactive) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SwipeCard candidate={candidate} anchor={anchor} />
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        <SwipeCard candidate={candidate} anchor={anchor} />
        <Stamp style={likeStyle} color={t.color.like} label="LIKE" pos="left" />
        <Stamp style={passStyle} color={t.color.pass} label="NOPE" pos="right" />
        <Stamp style={maybeStyle} color={t.color.textDim} label="MAYBE" pos="bottom" />
      </Animated.View>
    </GestureDetector>
  );
}

/** The swiped card, decoupled from the deck so it can fly off while the deck has already advanced. */
function ExitingCard({
  candidate,
  anchor,
  dir,
  from,
  onDone,
}: {
  candidate: Candidate;
  anchor?: LatLng;
  dir: SwipeDir;
  from: From;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const x = useSharedValue(from.x);
  const y = useSharedValue(from.y);

  useEffect(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onDone);
    };
    if (dir === 'LIKE') {
      x.value = withSpring(width * 1.5, { ...EXIT_SPRING, velocity: from.vx }, done);
    } else if (dir === 'PASS') {
      x.value = withSpring(-width * 1.5, { ...EXIT_SPRING, velocity: from.vx }, done);
    } else {
      y.value = withSpring(height * 1.2, { ...EXIT_SPRING, velocity: from.vy }, done);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <SwipeCard candidate={candidate} anchor={anchor} />
    </Animated.View>
  );
}

function Stamp({ style, color, label, pos }: { style: object; color: string; label: string; pos: 'left' | 'right' | 'bottom' }) {
  const posStyle = pos === 'left' ? styles.stampLike : pos === 'right' ? styles.stampPass : styles.stampMaybe;
  return (
    <Animated.View style={[styles.stamp, posStyle, { borderColor: color }, style]} pointerEvents="none">
      <Text style={[styles.stampText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

function RoundButton(props: { label: string; color: string; onPress: () => void; accessibilityLabel: string; size?: number }) {
  const t = useTheme();
  const size = props.size ?? 68;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, borderColor: props.color, backgroundColor: t.color.surface, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      <Text style={{ color: props.color, fontSize: size * 0.44, fontWeight: '700' }}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28, paddingBottom: 32 },
  button: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', borderWidth: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  stampLike: { top: 40, left: 24, transform: [{ rotate: '-14deg' }] },
  stampPass: { top: 40, right: 24, transform: [{ rotate: '14deg' }] },
  stampMaybe: { bottom: 120, alignSelf: 'center', transform: [{ rotate: '-4deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
});
