import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
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
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OrganizerHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userName, setUserName] = useState('Organizer');

  useEffect(() => {
    try {
      const stored = storage.getString('userProfile');
      if (stored) {
        const userObj = JSON.parse(stored);
        if (userObj?.display_name) {
          setUserName(userObj.display_name);
        }
      }
    } catch (e) {
      console.log('Failed to parse user profile:', e);
    }
  }, []);

  const orb1X = useSharedValue(SCREEN_WIDTH * 0.1);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.6);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.3, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.05, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const handleLocalLogout = () => {
    storage.delete('accessToken');
    storage.delete('refreshToken');
    storage.delete('userProfile');
    storage.delete('userRole');
    showMessage({
      message: 'Signed Out',
      description: 'You have logged out successfully.',
      type: 'info',
    });
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#0B1C2A" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userName.split(' ')[0]}! 🏆</Text>
            <Text style={styles.headerSubtitle}>Create tournaments and schedule fixtures</Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleLocalLogout}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tournaments</Text>
              <Text style={styles.metricValue}>2 Active</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Teams</Text>
              <Text style={styles.metricValue}>24 Registered</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Today's Matches</Text>
              <Text style={[styles.metricValue, styles.activeText]}>8 Live/Scheduled</Text>
            </View>
          </View>

          <SizedBox height={10} />

          {/* Tournament List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Tournaments</Text>
            
            <View style={styles.tournamentCard}>
              <View style={styles.tournamentHeader}>
                <Text style={styles.tournamentName}>Summer Cricket Championship</Text>
                <View style={styles.liveTag}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.tournamentDetails}>16 Teams • Ground: Green Field Arena</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar} />
                <Text style={styles.progressText}>Stage: Semi-Finals</Text>
              </View>
            </View>

            <View style={styles.tournamentCard}>
              <View style={styles.tournamentHeader}>
                <Text style={styles.tournamentName}>Pickleball Doubles Open</Text>
                <View style={[styles.liveTag, styles.upcomingTag]}>
                  <Text style={styles.upcomingText}>UPCOMING</Text>
                </View>
              </View>
              <Text style={styles.tournamentDetails}>8 Teams • Ground: Smash Pickle Club</Text>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Starts: August 5, 2026</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organizer Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>🏆</Text>
                <Text style={styles.actionTitle}>New Tournament</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>Add Match</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionTitle}>Manage Teams</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default OrganizerHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080612',
  },
  safeArea: {
    flex: 1,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 9999,
    width: 220,
    height: 220,
    opacity: 0.12,
  },
  orb1: {
    backgroundColor: '#00E676',
    top: 200,
    left: -50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 62, 62, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 62, 62, 0.25)',
  },
  logoutBtnText: {
    color: '#FF3E3E',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  activeText: {
    color: '#00D2FF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tournamentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tournamentName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  liveTag: {
    backgroundColor: 'rgba(255, 62, 62, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 62, 62, 0.25)',
  },
  liveText: {
    color: '#FF3E3E',
    fontSize: 10,
    fontWeight: '900',
  },
  upcomingTag: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderColor: 'rgba(0, 210, 255, 0.25)',
  },
  upcomingText: {
    color: '#00D2FF',
    fontSize: 9,
    fontWeight: '900',
  },
  tournamentDetails: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
