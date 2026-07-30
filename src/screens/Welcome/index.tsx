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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CImage from '../../Components/atoms/CImage';
import { Icons } from '../../assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const WelcomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Shared values for floating background elements
  const orb1X = useSharedValue(SCREEN_WIDTH * 0.15);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.2);
  const orb2X = useSharedValue(SCREEN_WIDTH * 0.75);
  const orb2Y = useSharedValue(SCREEN_HEIGHT * 0.65);
  
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate orbs
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.3, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.1, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(SCREEN_HEIGHT * 0.3, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.1, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb2X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.6, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.8, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Entrance
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: 1000 });
  }, []);

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const animatedOrb2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  const animatedContent = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* Orbs */}
      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />
      <Animated.View style={[styles.floatingOrb, styles.orb2, animatedOrb2]} />

      <SafeAreaView style={styles.contentContainer}>
        {/* Logo and Tagline */}
        <Animated.View style={[styles.centerContainer, animatedContent]}>
          <CImage source={Icons.crmLogo} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.tagline}>One Universe. Every Sport. Every Player.</Text>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.btnPrimary} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnSecondary} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnSecondaryText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080612',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
    zIndex: 10,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 9999,
    width: 280,
    height: 280,
    opacity: 0.12,
  },
  orb1: {
    backgroundColor: '#6C4DF6',
    top: -40,
    left: -40,
  },
  orb2: {
    backgroundColor: '#00D2FF',
    bottom: -40,
    right: -40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.38,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    marginBottom: 20,
    marginTop: -5,
  },
  badgeText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  btnPrimary: {
    height: 56,
    backgroundColor: '#6C4DF6',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnSecondary: {
    height: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
