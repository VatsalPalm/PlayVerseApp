import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, ViewStyle } from "react-native";

interface SkeletonLoaderProps {
  style?: ViewStyle;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.7,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  return <Animated.View style={[styles.skeleton, style, { opacity: pulseAnim }]} />;
};

export default SkeletonLoader;

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
  },
});
