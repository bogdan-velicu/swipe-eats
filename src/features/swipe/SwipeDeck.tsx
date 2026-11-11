import { useImperativeHandle, useRef, type Ref } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Candidate, SwipeDir } from '../../core/types';
import { useTheme } from '../../theme';
import { SwipeCard } from './SwipeCard';
import type { Deck } from './useDeck';

const SPRING = { damping: 18, stiffness: 160, mass: 0.8 } as const;
const FLING_SPRING = { damping: 20, stiffness: 120, mass: 0.8, overshootClamping: true } as const;
const VELOCITY_TRIGGER = 900;

interface CardHandle {
  fling: (dir: SwipeDir) => void;
}

interface DeckCardProps {
  candidate: Candidate;
  isTop: boolean;
  /** Top card's horizontal drag, shared so the card behind scales up as it is revealed. */
  dragX: SharedValue<number>;
  onCommit: (dir: SwipeDir) => void;
  handle?: Ref<CardHandle>;
}

/**
 * One gesture-driven card. All drag/spring work runs on the UI thread (worklets);
 * the JS thread is only touched once, when the fling spring finishes, to advance the deck.
 */
function DeckCard({ candidate, isTop, dragX, onCommit, handle }: DeckCardProps) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const threshold = width * 0.3;
  const offscreen = width * 1.4;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const done = useSharedValue(false);

  const flingTo = (dir: SwipeDir, velocity = 0) => {
    'worklet';
    if (done.value) return;
    done.value = true;
    const target = dir === 'LIKE' ? offscreen : -offscreen;
    dragX.value = withSpring(target, { ...FLING_SPRING, velocity });
    tx.value = withSpring(target, { ...FLING_SPRING, velocity }, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(onCommit, dir);
    });
  };

  useImperativeHandle(handle, () => ({ fling: (dir) => runOnUI(flingTo)(dir) }));

  const pan = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      'worklet';
      if (done.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.4;
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      'worklet';
      if (done.value) return;
      if (tx.value > threshold || e.velocityX > VELOCITY_TRIGGER) {
        flingTo('LIKE', e.velocityX);
      } else if (tx.value < -threshold || e.velocityX < -VELOCITY_TRIGGER) {
        flingTo('PASS', e.velocityX);
      } else {
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        dragX.value = withSpring(0, SPRING);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    if (isTop) {
      return {
        transform: [
          { translateX: tx.value },
          { translateY: ty.value },
          { rotate: `${interpolate(tx.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
        ],
      };
    }
    const reveal = interpolate(Math.abs(dragX.value), [0, threshold], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [{ scale: 0.94 + 0.06 * reveal }, { translateY: 12 * (1 - reveal) }],
      opacity: 0.6 + 0.4 * reveal,
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-threshold, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]} pointerEvents={isTop ? 'auto' : 'none'}>
        <SwipeCard candidate={candidate} />
        <Animated.View style={[styles.stamp, styles.stampLike, { borderColor: t.color.like }, likeStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: t.color.like }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampPass, { borderColor: t.color.pass }, passStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: t.color.pass }]}>NOPE</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Thin presentational layer: all deck logic comes from useDeck. */
export function SwipeDeck({ deck }: { deck: Deck }) {
  const t = useTheme();
  const dragX = useSharedValue(0);
  const topCard = useRef<CardHandle>(null);
  const { current, next, like, pass } = deck;

  const commit = (dir: SwipeDir) => {
    dragX.value = 0;
    if (dir === 'LIKE') like();
    else pass();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.stack, { margin: t.space.xl }]}>
        {next && <DeckCard key={next.id} candidate={next} isTop={false} dragX={dragX} onCommit={commit} />}
        {current && <DeckCard key={current.id} candidate={current} isTop dragX={dragX} onCommit={commit} handle={topCard} />}
      </View>
      <View style={styles.buttons}>
        <RoundButton label="✕" color={t.color.pass} accessibilityLabel="Pass" onPress={() => topCard.current?.fling('PASS')} />
        <RoundButton label="♥" color={t.color.like} accessibilityLabel="Like" onPress={() => topCard.current?.fling('LIKE')} />
      </View>
    </View>
  );
}

function RoundButton(props: { label: string; color: string; onPress: () => void; accessibilityLabel: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: props.color, backgroundColor: t.color.surface, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      <Text style={{ color: props.color, fontSize: 30, fontWeight: '700' }}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 32 },
  button: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', top: 40, borderWidth: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  stampLike: { left: 24, transform: [{ rotate: '-14deg' }] },
  stampPass: { right: 24, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
});
