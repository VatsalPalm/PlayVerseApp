import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const BUTTON_HEIGHT = 56;
const HANDLE_SIZE = 48;
const PADDING = 4;

interface CButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  width?: any;
  backgroundColor?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const CButton: React.FC<CButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  width = "100%",
  backgroundColor = "#6C4DF6",
  color = "#FFFFFF",
  style,
  textStyle,
}) => {
  const [buttonWidth, setButtonWidth] = useState(0);
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(false);

  const maxDragDistance = buttonWidth ? buttonWidth - HANDLE_SIZE - PADDING * 2 : 0;

  // Synchronize handle position with loading state changes
  useEffect(() => {
    if (loading) {
      if (maxDragDistance > 0) {
        translateX.value = withTiming(maxDragDistance, { duration: 150 });
        isCompleted.value = true;
      }
    } else if (isCompleted.value) {
      translateX.value = withTiming(0, { duration: 350 });
      isCompleted.value = false;
    }
  }, [loading, maxDragDistance]);

  const onTriggerAction = () => {
    if (onPress) {
      onPress();
    }
    
    // Auto reset if parent does not enter loading state within 300ms (covers sync warnings/validation errors)
    setTimeout(() => {
      if (!loading && isCompleted.value) {
        translateX.value = withTiming(0, { duration: 350 });
        isCompleted.value = false;
      }
    }, 300);
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx: any) => {
      if (isCompleted.value || disabled || loading || !maxDragDistance) return;
      const nextX = ctx.startX + event.translationX;
      translateX.value = Math.min(Math.max(0, nextX), maxDragDistance);
    },
    onEnd: () => {
      if (isCompleted.value || disabled || loading || !maxDragDistance) return;

      // Swipe past 85% to confirm
      if (translateX.value > maxDragDistance * 0.85) {
        translateX.value = withSpring(maxDragDistance, { damping: 15 });
        isCompleted.value = true;
        runOnJS(onTriggerAction)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    },
  });

  const animatedHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: translateX.value + HANDLE_SIZE,
  }));

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = maxDragDistance > 0 ? 1 - (translateX.value / maxDragDistance) * 1.5 : 1;
    return {
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <View
      style={[styles.container, { width }, style]}
      onLayout={(e) => {
        const { width: layoutWidth } = e.nativeEvent.layout;
        setButtonWidth(layoutWidth);
      }}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: disabled
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(255, 255, 255, 0.05)",
          },
        ]}
      >
        {/* Animated Slide Progress Fill */}
        {!disabled && (
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor },
              animatedFillStyle,
            ]}
          />
        )}

        {/* Swipe Instruction Text */}
        <Animated.View style={[styles.textWrapper, animatedTextStyle]}>
          <Text
            style={[
              styles.swipeText,
              { color: disabled ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.6)" },
              textStyle,
            ]}
          >
            {loading ? "Processing..." : `Swipe to ${title}`}
          </Text>
        </Animated.View>

        {/* Sliding Handle */}
        <PanGestureHandler onGestureEvent={gestureHandler} enabled={!disabled && !loading}>
          <Animated.View
            style={[
              styles.handle,
              { left: PADDING },
              animatedHandleStyle,
              disabled && styles.handleDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={backgroundColor} size="small" />
            ) : (
              <Text style={[styles.handleIcon, { color: backgroundColor }]}>
                {Platform.OS === "ios" ? "〉" : "≫"}
              </Text>
            )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

export default CButton;

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    alignSelf: "center",
    marginVertical: 10,
  },
  track: {
    flex: 1,
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  fill: {
    position: "absolute",
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: (BUTTON_HEIGHT - PADDING * 2) / 2,
  },
  textWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  handle: {
    position: "absolute",
    top: PADDING,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  handleDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  handleIcon: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
