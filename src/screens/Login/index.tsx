import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CTextInput from '../../Components/atoms/CTextInput';
import CImage from '../../Components/atoms/CImage';
import SizedBox from '../../Components/atoms/SizeBox';
import { Icons } from '../../assets';
import { useAuthControllerLoginUser } from '../../Api/educationApiComponents';
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import DeviceInfo from 'react-native-device-info';
import { getFcmPushToken } from '../../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const { mutate: login, isPending } = useAuthControllerLoginUser({
    onSuccess: (data: any) => {
      if (data?.access_token) {
        storage.set('accessToken', data.access_token);
        if (data?.refresh_token) {
          storage.set('refreshToken', data.refresh_token);
        }
        storage.set('userProfile', JSON.stringify(data));
        
        showMessage({
          message: 'Welcome Back!',
          description: `Logged in successfully as ${data.full_name || 'User'}`,
          type: 'success',
          icon: 'success',
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // Fallback if no token is returned but success
        showMessage({
          message: 'Login Successful',
          description: 'Access granted.',
          type: 'success',
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    },
    onError: (error: any) => {
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
        // Navigate to Otp screen, passing mobileNumber and a dummy/empty token if none exists yet
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

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      showMessage({
        message: 'Required Fields',
        description: 'Please enter both phone number and password.',
        type: 'warning',
      });
      return;
    }

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

    login({
      body: {
        mobile_number: phone.trim(),
        country_code: '+91',
        password: password.trim(),
        app_type: 'App',
        os,
        brand,
        model_no: model,
        serial_number: uniqueId,
        version_number: osVersion,
        fcm_token: fcmToken,
      } as any
    });
  };

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

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <SizedBox height={20} />
          
          {/* Top Logo */}
          <CImage source={Icons.crmLogo} style={styles.logoImage} resizeMode="contain" />
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Welcome back! Enter your credentials to access your account.</Text>
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
            
            <SizedBox height={20} />
            
            <CTextInput 
              label="Password" 
              placeholder="Enter your password" 
              value={password}
              onChangeTextValue={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <SizedBox height={40} />

            <TouchableOpacity 
              style={styles.btnLogin} 
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnLoginText}>Sign In</Text>
              )}
            </TouchableOpacity>
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
});
