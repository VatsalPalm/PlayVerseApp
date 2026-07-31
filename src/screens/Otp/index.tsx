import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CTextInput from '../../Components/atoms/CTextInput';
import SizedBox from '../../Components/atoms/SizeBox';
import CImage from '../../Components/atoms/CImage';
import { Icons } from '../../assets';
import { useAuthControllerVerifyOtp } from '../../Api/playVerseComponents';
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OtpRouteProp = RouteProp<RootStackParamList, 'Otp'>;

const OtpScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OtpRouteProp>();
  const mobileNumber = route.params?.mobileNumber || '';
  const initialToken = route.params?.token || '';

  const [otp, setOtp] = useState('');

  const { mutate: verifyOtp, isPending } = useAuthControllerVerifyOtp({
    onSuccess: (data: any) => {
      const result = data?.result || data;
      if (result?.accessToken) {
        storage.set('accessToken', result.accessToken);
        if (result?.refreshToken) {
          storage.set('refreshToken', result.refreshToken);
        }
        storage.set('userProfile', JSON.stringify(result));
        const primaryRole = result?.roles?.[0]?.name || 'PLAYER';
        storage.set('userRole', primaryRole);

        showMessage({
          message: 'OTP Verified!',
          description: 'Login successful.',
          type: 'success',
          icon: 'success',
          duration: 3000,
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        showMessage({
          message: 'Account Verified!',
          description: 'Your account is verified successfully. You can now login.',
          type: 'success',
          icon: 'success',
          duration: 3500,
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    },
    onError: (error: any) => {
      console.log('OTP verification error:', error);
      let errMsg = 'OTP verification failed. Please check the code.';
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

      showMessage({
        message: 'Verification Failed',
        description: errMsg,
        type: 'danger',
        icon: 'danger',
      });
    }
  });

  const handleVerify = () => {
    if (!otp.trim()) {
      showMessage({
        message: 'Enter OTP',
        description: 'Please enter the verification code sent to your mobile number.',
        type: 'warning',
      });
      return;
    }

    verifyOtp({
      body: {
        mobile_number: mobileNumber,
        country_code: '+91',
        otp: otp.trim(),
        token: initialToken || '00000000-0000-0000-0000-000000000000',
      }
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <CImage source={Icons.crmLogo} style={styles.logoImage} resizeMode="contain" />
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              We have sent a verification code to:
            </Text>
            <Text style={styles.emailText}>{mobileNumber}</Text>
          </View>

          <SizedBox height={30} />

          <View style={styles.form}>
            <CTextInput 
              label="OTP Code" 
              placeholder="Enter code" 
              value={otp}
              onChangeTextValue={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />

            <SizedBox height={30} />

            <TouchableOpacity 
              style={styles.btnVerify} 
              activeOpacity={0.8}
              onPress={handleVerify}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnVerifyText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          <SizedBox height={40} />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive code? </Text>
            <TouchableOpacity onPress={() => {
              showMessage({
                message: 'OTP Resent',
                description: 'A new verification code was sent to your email.',
                type: 'info',
              });
            }}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080612',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 10,
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.22,
    marginBottom: 20,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
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
    fontWeight: '400',
  },
  emailText: {
    color: '#00D2FF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  btnVerify: {
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
  btnVerifyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  resendLink: {
    color: '#6C4DF6',
    fontSize: 14,
    fontWeight: '700',
  },
});
