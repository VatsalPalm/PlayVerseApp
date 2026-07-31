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

const GroundOwnerHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userName, setUserName] = useState('Owner');

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

  const orb1X = useSharedValue(SCREEN_WIDTH * 0.7);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.2);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.5, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.8, { duration: 9000, easing: Easing.inOut(Easing.ease) })
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
              <Stop offset="50%" stopColor="#150D2A" />
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
            <Text style={styles.greeting}>Hello, {userName.split(' ')[0]}! 🏟️</Text>
            <Text style={styles.headerSubtitle}>Manage your arenas and daily bookings</Text>
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
          
          {/* Quick Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Grounds</Text>
              <Text style={styles.metricValue}>3 Active</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Today's Bookings</Text>
              <Text style={styles.metricValue}>12 Slots</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Revenue (Today)</Text>
              <Text style={[styles.metricValue, styles.revenueText]}>₹18,500</Text>
            </View>
          </View>

          <SizedBox height={10} />

          {/* Booking Approvals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approval (2)</Text>
            
            <View style={styles.approvalCard}>
              <View style={styles.approvalHeader}>
                <Text style={styles.approvalGround}>Green Field Arena (Pitch A)</Text>
                <Text style={styles.approvalTime}>Today • 6:00 PM</Text>
              </View>
              <Text style={styles.approvalUser}>Booked by: Rajesh Kumar (Cricket)</Text>
              <View style={styles.approvalActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]}>
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.approvalCard}>
              <View style={styles.approvalHeader}>
                <Text style={styles.approvalGround}>Smash Pickle Club (Court 2)</Text>
                <Text style={styles.approvalTime}>Tomorrow • 8:00 AM</Text>
              </View>
              <Text style={styles.approvalUser}>Booked by: Steve Smith (Pickleball)</Text>
              <View style={styles.approvalActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]}>
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Venue Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionTitle}>Add Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>Manage Slots</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionTitle}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default GroundOwnerHomeScreen;

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
    width: 200,
    height: 200,
    opacity: 0.12,
  },
  orb1: {
    backgroundColor: '#00D2FF',
    bottom: 100,
    right: -50,
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
  },
  revenueText: {
    color: '#00E676',
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
  approvalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  approvalGround: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  approvalTime: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '600',
  },
  approvalUser: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 14,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineBtn: {
    backgroundColor: 'rgba(255, 62, 62, 0.08)',
    borderColor: 'rgba(255, 62, 62, 0.2)',
  },
  declineText: {
    color: '#FF3E3E',
    fontSize: 12,
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  approveText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
  },
});
