import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CTextInput from '../../Components/atoms/CTextInput';
import CImage from '../../Components/atoms/CImage';
import SizedBox from '../../Components/atoms/SizeBox';
import CButton from '../../Components/atoms/CButton';
import { Icons } from '../../assets';
import { useAuthControllerLoginUser } from '../../Api/playVerseComponents';
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import DeviceInfo from 'react-native-device-info';
import * as Location from 'expo-location';
import { getFcmPushToken } from '../../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const { mutate: login, isPending } = useAuthControllerLoginUser({
    onSuccess: (data: any) => {
      setLocalLoading(false);
      const otpToken = data?.data?.token || data?.token;
      if (otpToken) {
        showMessage({
          message: 'OTP Sent',
          description: 'Please verify with the static OTP code.',
          type: 'success',
          icon: 'success',
        });
        navigation.navigate('Otp', { mobileNumber: phone.trim(), token: otpToken });
      } else {
        const accessToken = data?.access_token || data?.result?.accessToken;
        if (accessToken) {
          storage.set('accessToken', accessToken);
          if (data?.refresh_token || data?.result?.refreshToken) {
            storage.set('refreshToken', data.refresh_token || data.result.refreshToken);
          }
          storage.set('userProfile', JSON.stringify(data?.result || data));
          const primaryRole = data?.result?.roles?.[0]?.name || 'PLAYER';
          storage.set('userRole', primaryRole);
          
          showMessage({
            message: 'Welcome Back!',
            description: `Logged in successfully.`,
            type: 'success',
            icon: 'success',
          });

          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          showMessage({
            message: 'Login Successful',
            description: 'Please verify the OTP code sent to your phone.',
            type: 'success',
          });
          // Attempt redirecting with an empty token parameter so they can input code manually if required
          navigation.navigate('Otp', { mobileNumber: phone.trim(), token: '' });
        }
      }
    },
    onError: (error: any) => {
      setLocalLoading(false);
      console.log('Login error details:', error);
      let errMsg = 'Invalid credentials. Please try again.';
      if (typeof error?.message === 'string') {
        errMsg = error.message;
      } else if (error?.message && typeof error.message === 'object') {
        const messages: string[] = [];
        for (const key in error.message) {
          if (Array.isArray(error.message[key])) {
            messages.push(...error.message[key]);
          } else if (typeof error.message[key] === 'string') {
            messages.push(error.message[key]);
          }
        }
        if (messages.length > 0) {
          errMsg = messages.join('\n');
        }
      } else if (typeof error?.payload === 'string') {
        errMsg = error.payload;
      }
      
      if (errMsg.toLowerCase().includes('not verified') || error?.statusCode === 403) {
        showMessage({
          message: 'Verification Required',
          description: 'Your account is not verified. Please verify your OTP.',
          type: 'warning',
          icon: 'warning',
        });
        navigation.navigate('Otp', { mobileNumber: phone.trim(), token: '' });
      } else {
        showMessage({
          message: 'Login Failed',
          description: errMsg,
          type: 'danger',
          icon: 'danger',
        });
      }
    }
  });

  const proceedWithLogin = async (requestLocationPermission: boolean) => {
    setShowLocationModal(false);
    storage.set('locationPromptDismissed', true);
    setLocalLoading(true);

    let fcmToken = 'fcm_token_001';
    let brand = 'Generic';
    let model = 'Device';
    let os = 'Android';
    let osVersion = '1.0';
    let uniqueId = 'N/A';

    try {
      const tokenResult = await getFcmPushToken();
      if (tokenResult) {
        fcmToken = tokenResult;
      }
      brand = DeviceInfo.getBrand() || brand;
      model = DeviceInfo.getModel() || model;
      os = DeviceInfo.getSystemName() || os;
      osVersion = DeviceInfo.getSystemVersion() || osVersion;
      uniqueId = await DeviceInfo.getUniqueId() || uniqueId;
    } catch (e) {
      console.log('Failed to fetch device / fcm info:', e);
    }

    let lat: number | undefined;
    let lng: number | undefined;

    if (requestLocationPermission) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          // Check if Location Services are enabled on the device
          try {
            await Location.hasServicesEnabledAsync();
          } catch (err: any) {
            console.log('Failed to check location services:', err?.message || err);
          }

          let loc: Location.LocationObject | null = null;
          
          try {
            loc = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
            ]);
          } catch (err: any) {
            console.log('getCurrentPositionAsync failed with error:', err?.message || err);
          }

          // Fallback to getLastKnownPositionAsync if getCurrentPositionAsync failed, timed out, or returned null
          if (!loc) {
            try {
              loc = await Location.getLastKnownPositionAsync();
            } catch (err: any) {
              console.log('getLastKnownPositionAsync failed with error:', err?.message || err);
            }
          }

          if (loc && loc.coords) {
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } else {
          showMessage({
            message: 'Permission Denied',
            description: 'Continuing login without location access.',
            type: 'info',
          });
        }
      } catch (e: any) {
        console.log('Failed to fetch location on login:', e?.message || e);
      }
    }

    const requestBody = {
      mobile_number: phone.trim(),
      country_code: '+91',
      app_type: 'App',
      os,
      brand,
      model_no: model,
      serial_number: uniqueId,
      version_number: osVersion,
      fcm_token: fcmToken,
      latitude: lat,
      longitude: lng,
    };

    login({
      body: requestBody as any
    });
  };

  const handleLogin = async () => {
    console.log('[handleLogin] triggered, phone:', phone);
    if (!phone.trim()) {
      showMessage({
        message: 'Required Fields',
        description: 'Please enter your phone number.',
        type: 'warning',
      });
      return;
    }

    try {
      console.log('[handleLogin] checking location permissions...');
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('[handleLogin] current location status:', status);
      const hasDismissedPrompt = storage.getBoolean('locationPromptDismissed');
      console.log('[handleLogin] locationPromptDismissed flag:', hasDismissedPrompt);

      if (status === 'granted') {
        proceedWithLogin(true);
      } else if (hasDismissedPrompt) {
        proceedWithLogin(false);
      } else {
        console.log('[handleLogin] showing location permissions modal...');
        setShowLocationModal(true);
      }
    } catch (e) {
      console.log('Error checking location permission:', e);
      setShowLocationModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Location Permission Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="location" size={40} color="#6C4DF6" />
            </View>
            <Text style={styles.modalTitle}>Enable Location Services</Text>
            <Text style={styles.modalDescription}>
              PlayVerse uses your location to discover sports venues, matching teams, and ongoing events happening near you. This ensures a personalized local match experience.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnAllow}
                activeOpacity={0.8}
                onPress={() => proceedWithLogin(true)}
              >
                <Text style={styles.btnAllowText}>Allow Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSkip}
                activeOpacity={0.8}
                onPress={() => proceedWithLogin(false)}
              >
                <Text style={styles.btnSkipText}>Skip for Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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

      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContainer, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          <SizedBox height={20} />
          
          {/* Top Logo */}
          <CImage source={Icons.crmLogo} style={styles.logoImage} resizeMode="contain" />
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Welcome back! Enter your phone number to access your account.</Text>
          </View>

          <SizedBox height={30} />

          {/* Form */}
          <View style={styles.form}>
            <CTextInput 
              label="Phone Number" 
              placeholder="Enter 10-digit number" 
              value={phone}
              onChangeTextValue={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            
            <SizedBox height={30} />

            <CButton
              title="Sign In"
              onPress={handleLogin}
              loading={isPending || localLoading}
              disabled={isPending || localLoading}
              swipeable={true}
            />
          </View>

          <SizedBox height={30} />

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to PlayVerse? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080612',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.25,
    marginTop: 10,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  btnLogin: {
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
  btnLoginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footerLink: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#120E2E',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.2)',
  },
  locationIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 77, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  btnAllow: {
    height: 50,
    backgroundColor: '#6C4DF6',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnAllowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSkip: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnSkipText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});
