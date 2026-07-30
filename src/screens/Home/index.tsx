import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = () => {
  // Shared values for floating background elements
  const orb1X = useSharedValue(SCREEN_WIDTH * 0.2);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.25);
  const orb2X = useSharedValue(SCREEN_WIDTH * 0.7);
  const orb2Y = useSharedValue(SCREEN_HEIGHT * 0.7);
  
  // Shared values for interactive components
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Animate the floating orbs gently
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.35, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.15, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.2, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(SCREEN_HEIGHT * 0.15, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.35, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.25, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    orb2X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.5, { duration: 11000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.8, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.7, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(SCREEN_HEIGHT * 0.8, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.6, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.7, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Entrance animations
    logoScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.5)) });
    logoOpacity.value = withTiming(1, { duration: 1000 });
    
    cardOpacity.value = withTiming(1, { duration: 1000 });
    cardTranslateY.value = withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) });
  }, []);

  // Animated styles for background orbs
  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const animatedOrb2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  // Animated styles for content
  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedCard = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const animatedButton = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 150 });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#0B0914" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#050308" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* Floating Glowing Orbs */}
      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />
      <Animated.View style={[styles.floatingOrb, styles.orb2, animatedOrb2]} />

      <SafeAreaView style={styles.contentContainer}>
        {/* Header / Brand Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogo]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>✦ ENTER THE VERSE</Text>
          </View>
          <Text style={styles.logoText}>PlayVerse</Text>
          <Text style={styles.tagline}>Unleash the Play • Explore the Verse</Text>
        </Animated.View>

        {/* Central Premium Card */}
        <Animated.View style={[styles.glassCard, animatedCard]}>
          <View style={styles.innerCard}>
            <Text style={styles.welcomeTitle}>Welcome to PlayVerse</Text>
            <Text style={styles.welcomeDescription}>
              Step into a unified realm of gaming, dynamic interaction, and endless possibilities. Your next adventure begins here.
            </Text>
            
            {/* Elegant Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
            </View>

            {/* Feature Row */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🎮</Text>
                <Text style={styles.featureLabel}>Immersive</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>⚡</Text>
                <Text style={styles.featureLabel}>Ultra-Fast</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🛡️</Text>
                <Text style={styles.featureLabel}>Secure</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Action Button Section */}
        <Animated.View style={[styles.actionSection, animatedButton]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.actionButton}
          >
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#6C4DF6" />
                  <Stop offset="100%" stopColor="#A05CFF" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={28} fill="url(#btnGrad)" />
            </Svg>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    zIndex: 10,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 9999,
    width: 250,
    height: 250,
    opacity: 0.15,
  },
  orb1: {
    backgroundColor: '#6C4DF6',
    top: -50,
    left: -50,
  },
  orb2: {
    backgroundColor: '#A05CFF',
    bottom: -50,
    right: -50,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoBadge: {
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.3)',
    marginBottom: 20,
  },
  logoBadgeText: {
    color: '#D2C4FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(160, 92, 255, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  tagline: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  innerCard: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 60,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A05CFF',
    marginHorizontal: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionSection: {
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
