import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import { fetchTournamentControllerListTournaments } from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';
import MyTeamsModal from '../../Components/MyTeamsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPORT_COLORS: Record<string, string> = {
  Cricket: '#FF7A00',
  Football: '#00E676',
  Pickleball: '#00D2FF',
  Badminton: '#A855F7',
};

const SPORT_BG: Record<string, string> = {
  Cricket: 'rgba(255, 122, 0, 0.12)',
  Football: 'rgba(0, 230, 118, 0.12)',
  Pickleball: 'rgba(0, 210, 255, 0.12)',
  Badminton: 'rgba(168, 85, 247, 0.12)',
};

const statusColors: Record<string, string> = {
  DRAFT: '#9CA3AF',
  UPCOMING: '#00D2FF',
  ONGOING: '#00E676',
  COMPLETED: '#A855F7',
  CANCELLED: '#EF4444',
};

const OrganizerHomeScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Organizer');
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [showMyTeamsModal, setShowMyTeamsModal] = useState(false);

  const loadData = async (orgId: number) => {
    try {
      setLoading(true);
      const res = await fetchTournamentControllerListTournaments({
        queryParams: {
          limit: 50,
          offset: 0,
        },
      }) as any;

      const listArray = res?.data || [];
      const filtered = listArray.filter((t: any) => t.organizer_id === orgId);
      setMyTournaments(filtered);
    } catch (e) {
      console.log('Failed to load organizer tournaments:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      try {
        const stored = storage.getString('userProfile');
        if (stored) {
          const userObj = JSON.parse(stored);
          if (userObj?.display_name) {
            setUserName(userObj.display_name);
          }
          if (userObj?.id) {
            setUserId(userObj.id);
            loadData(userObj.id);
          }
        }
      } catch (e) {
        console.log('Failed to parse user profile:', e);
      }
    }, [])
  );

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

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          
          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tournaments</Text>
              <Text style={styles.metricValue}>{loading ? '...' : `${myTournaments.length} Active`}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Teams</Text>
              <Text style={styles.metricValue}>
                {loading ? '...' : `${myTournaments.reduce((acc, t) => acc + (t.max_teams || 16), 0)} Registered`}
              </Text>
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
            
            {loading ? (
              <ActivityIndicator size="small" color="#6C4DF6" style={{ marginVertical: 20 }} />
            ) : myTournaments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>You haven't created any tournaments yet.</Text>
                <SizedBox height={12} />
                <TouchableOpacity 
                  style={styles.emptyCreateBtn} 
                  onPress={() => navigation.navigate('CreateTournament')}
                >
                  <Text style={styles.emptyCreateBtnText}>Create Your First Tournament</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myTournaments.map((item) => {
                const sportName = item.sport_name || 'Pickleball';
                const statusColorVal = statusColors[item.status] || '#FFF';
                const sportColor = SPORT_COLORS[sportName] || '#6C4DF6';
                const sportBg = SPORT_BG[sportName] || 'rgba(108, 77, 246, 0.1)';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.tournamentCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('TournamentDetails', { tournamentId: item.id })}
                  >
                    <View style={styles.cardGlassHighlight} />
                    
                    <View style={styles.tournamentHeader}>
                      <View style={[styles.sportBadge, { backgroundColor: sportBg }]}>
                        <Text style={[styles.sportBadgeText, { color: sportColor }]}>
                          {sportName.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, { 
                        borderColor: statusColorVal + '40', 
                        backgroundColor: statusColorVal + '12',
                        borderWidth: 1, 
                      }]}>
                        <Text style={{ color: statusColorVal, fontSize: 9, fontWeight: '900' }}>
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <SizedBox height={12} />
                    <Text style={styles.tournamentName} numberOfLines={1}>{item.name}</Text>
                    
                    <SizedBox height={14} />
                    <View style={styles.cardFooter}>
                      <View style={styles.dateBox}>
                        <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                        <Text style={styles.footerVal}>
                          {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBD'}
                        </Text>
                      </View>
                      <View style={styles.teamBox}>
                        <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                        <Text style={styles.footerVal}>
                          {item.max_teams || 16} slots
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organizer Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('CreateTournament')}
              >
                <Text style={styles.actionIcon}>🏆</Text>
                <Text style={styles.actionTitle}>New Tournament</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('TournamentList')}
              >
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('MatchHistory')}
              >
                <Text style={styles.actionIcon}>⚡</Text>
                <Text style={styles.actionTitle}>Match History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setShowMyTeamsModal(true)}
              >
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionTitle}>My Teams</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
      <MyTeamsModal
        visible={showMyTeamsModal}
        onClose={() => setShowMyTeamsModal(false)}
      />
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
    width: 280,
    height: 280,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  statusTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerVal: {
    color: '#9CA3AF',
    fontSize: 12,
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
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    backgroundColor: '#6C4DF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  emptyCreateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
