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

const PlayerHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userName, setUserName] = useState('User');
  const [selectedSport, setSelectedSport] = useState('Cricket');

  // Load user name from stored profile
  useEffect(() => {
    try {
      const stored = storage.getString('userProfile');
      if (stored) {
        const userObj = JSON.parse(stored);
        if (userObj?.display_name) {
          setUserName(userObj.display_name);
        } else if (userObj?.full_name) {
          setUserName(userObj.full_name);
        }
      }
    } catch (e) {
      console.log('Failed to parse user profile:', e);
    }
  }, []);

  // Shared values for background orbs
  const orb1X = useSharedValue(SCREEN_WIDTH * 0.2);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.15);

  useEffect(() => {
    // Orb animations
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.35, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.15, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(SCREEN_HEIGHT * 0.1, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_HEIGHT * 0.25, { duration: 9000, easing: Easing.inOut(Easing.ease) })
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

      {/* Floating glowing orbs */}
      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userName.split(' ')[0]}! 👋</Text>
            <Text style={styles.headerSubtitle}>Ready to lead your team to victory?</Text>
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
          
          {/* Choose Your Sport Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
              {['Cricket', 'Pickleball', 'Football', 'Badminton'].map((sport) => {
                const isSelected = selectedSport === sport;
                const emoji = sport === 'Cricket' ? '🏏' : sport === 'Pickleball' ? '🏓' : sport === 'Football' ? '⚽' : '🏸';
                return (
                  <TouchableOpacity
                    key={sport}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSport(sport)}
                    style={[styles.sportTab, isSelected && styles.sportTabActive]}
                  >
                    <Text style={styles.sportEmoji}>{emoji}</Text>
                    <Text style={[styles.sportText, isSelected && styles.sportTextActive]}>{sport}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Live Match Card */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Match</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.glassCard}>
              <Text style={styles.matchSub}>T20 League • Today, 8:00 PM</Text>
              
              <View style={styles.teamsRow}>
                <View style={styles.teamContainer}>
                  <Text style={styles.teamName}>Warriors</Text>
                  <Text style={styles.teamScore}>162 / 6</Text>
                  <Text style={styles.teamOvers}>20.0 Overs</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.teamContainer}>
                  <Text style={styles.teamName}>Titans</Text>
                  <Text style={styles.teamScore}>127 / 4</Text>
                  <Text style={styles.teamOvers}>16.3 Overs</Text>
                </View>
              </View>

              <View style={styles.targetContainer}>
                <Text style={styles.targetText}>NEED 36 RUNS</Text>
                <Text style={styles.ballsText}>21 BALLS REMAINING</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.playerRow}>
                <View>
                  <Text style={styles.playerRole}>Current Batter</Text>
                  <Text style={styles.playerName}>Steve 🏏 32 (24)</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.playerRole}>Current Bowler</Text>
                  <Text style={styles.playerName}>Abhi 2-18 (3.0)</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.matchCenterBtn} activeOpacity={0.8}>
                <Text style={styles.matchCenterText}>Match Center</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {[
                { title: 'Live Scoring', icon: '⚡' },
                { title: 'Book Ground', icon: '🏟️' },
                { title: 'My Teams', icon: '👥' },
                { title: 'AI Insights', icon: '🧠' }
              ].map((action, index) => (
                <TouchableOpacity key={index} style={styles.actionCard} activeOpacity={0.8}>
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Bookings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <View style={styles.bookingItem}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingGround}>Green Field Arena</Text>
                <Text style={styles.bookingDate}>18 May • 6:00 PM</Text>
              </View>
              <View style={[styles.statusBadge, styles.statusConfirmed]}>
                <Text style={styles.statusTextConfirmed}>Confirmed</Text>
              </View>
            </View>

            <View style={styles.bookingItem}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingGround}>Smash Pickle Club</Text>
                <Text style={styles.bookingDate}>19 May • 8:00 AM</Text>
              </View>
              <View style={[styles.statusBadge, styles.statusPending]}>
                <Text style={styles.statusTextPending}>Pending</Text>
              </View>
            </View>
          </View>
          
          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

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
    width: 250,
    height: 250,
    opacity: 0.15,
  },
  orb1: {
    backgroundColor: '#6C4DF6',
    top: -50,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 62, 62, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3E3E',
    marginRight: 5,
  },
  liveBadgeText: {
    color: '#FF3E3E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sportsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  sportTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sportTabActive: {
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    borderColor: '#6C4DF6',
  },
  sportEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  sportText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  sportTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  matchSub: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  teamContainer: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  teamScore: {
    color: '#00D2FF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  teamOvers: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },
  vsText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  targetContainer: {
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(108, 77, 246, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.15)',
  },
  targetText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ballsText: {
    color: '#D2C4FF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerRole: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '500',
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  matchCenterBtn: {
    height: 44,
    backgroundColor: '#6C4DF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  matchCenterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  bookingLeft: {
    flex: 1,
  },
  bookingGround: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bookingDate: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 145, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.25)',
  },
  statusTextConfirmed: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#FF9100',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default PlayerHomeScreen;
