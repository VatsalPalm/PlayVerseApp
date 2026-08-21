/**
 * FloatingOrbs — reusable ambient background bubble component.
 *
 * Renders two gently drifting blurred orbs in the top-left and
 * bottom-right corners. Drop it inside any root <View> right after
 * the SVG gradient background to get the consistent look.
 *
 * Usage:
 *   import FloatingOrbs from '../../Components/atoms/FloatingOrbs';
 *   <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#00D2FF" />
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const ORB_SIZE = 280;
const OPACITY = 0.12;

interface FloatingOrbsProps {
  orb1Color?: string;
  orb2Color?: string;
}

const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  orb1Color = '#6C4DF6',
  orb2Color = '#00D2FF',
}) => {
  const orb1X = useSharedValue(-60);
  const orb1Y = useSharedValue(-60);
  const orb2X = useSharedValue(60);
  const orb2Y = useSharedValue(60);

  useEffect(() => {
    // Orb 1 — slow horizontal drift
    orb1X.value = withRepeat(
      withTiming(20, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    orb1Y.value = withRepeat(
      withTiming(20, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // Orb 2 — slightly faster drift
    orb2X.value = withRepeat(
      withTiming(-20, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    orb2Y.value = withRepeat(
      withTiming(-20, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const animOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const animOrb2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  return (
    <>
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: orb1Color, top: -80, left: -80 },
          animOrb1,
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: orb2Color, bottom: -80, right: -80 },
          animOrb2,
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: 9999,
    opacity: OPACITY,
  },
});

export default FloatingOrbs;
