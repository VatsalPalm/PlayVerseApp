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

const AdminHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userName, setUserName] = useState('Admin');

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

  const orb1X = useSharedValue(SCREEN_WIDTH * 0.4);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.1);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.2, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.6, { duration: 8000, easing: Easing.inOut(Easing.ease) })
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
              <Stop offset="50%" stopColor="#250C1B" />
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
            <Text style={styles.greeting}>Admin Console ⚙️</Text>
            <Text style={styles.headerSubtitle}>System Monitor & User Management</Text>
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
          
          {/* Status Indicator */}
          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>All Systems Operational</Text>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Users</Text>
              <Text style={styles.metricValue}>1,250</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active Grounds</Text>
              <Text style={styles.metricValue}>48</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Daily Bookings</Text>
              <Text style={[styles.metricValue, styles.activeText]}>212</Text>
            </View>
          </View>

          <SizedBox height={10} />

          {/* System Logs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Logs</Text>
            
            <View style={styles.logItem}>
              <Text style={styles.logTime}>10:24:12</Text>
              <Text style={styles.logMessage}>New user registered: Rajesh Kumar (+91 9876543210)</Text>
            </View>
            
            <View style={styles.logItem}>
              <Text style={styles.logTime}>10:15:45</Text>
              <Text style={styles.logMessage}>Ground Owner approved: Smash Pickle Club (ID: 12)</Text>
            </View>

            <View style={styles.logItem}>
              <Text style={styles.logTime}>09:55:01</Text>
              <Text style={styles.logMessage}>Database backup completed successfully (size: 29.3 KB)</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Controls</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionTitle}>User Control</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>🏟️</Text>
                <Text style={styles.actionTitle}>Verify Grounds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>🔧</Text>
                <Text style={styles.actionTitle}>Config App</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AdminHomeScreen;

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
    backgroundColor: '#FF007F',
    top: -50,
    alignSelf: 'center',
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
    marginRight: 8,
  },
  statusText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
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
    color: '#FF007F',
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
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF007F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logTime: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  logMessage: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
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
