import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CTextInput from '../../Components/atoms/CTextInput';
import SizedBox from '../../Components/atoms/SizeBox';
import CImage from '../../Components/atoms/CImage';
import CButton from '../../Components/atoms/CButton';
import { Icons } from '../../assets';
import { useAuthControllerVerifyOtp } from '../../Api/playVerseComponents';
import { storage } from '../../services/mmkv';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import FloatingOrbs from '../../Components/atoms/FloatingOrbs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OtpRouteProp = RouteProp<RootStackParamList, 'Otp'>;

const OtpScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OtpRouteProp>();
  const mobileNumber = route.params?.mobileNumber || '';
  const initialToken = route.params?.token || '';

  const [otp, setOtp] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleOtpChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    setOtp(cleanValue);
    
    if (cleanValue.length === 6) {
      verifyOtp({
        body: {
          mobile_number: mobileNumber,
          country_code: '+91',
          otp: cleanValue,
          token: initialToken || '00000000-0000-0000-0000-000000000000',
        }
      });
    }
  };

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
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      showMessage({
        message: 'Enter OTP',
        description: 'Please enter the verification code sent to your mobile number.',
        type: 'warning',
      });
      return;
    }

    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(trimmedOtp)) {
      showMessage({
        message: 'Validation Error',
        description: 'Please enter a valid 6-digit verification code.',
        type: 'warning',
      });
      return;
    }

    verifyOtp({
      body: {
        mobile_number: mobileNumber,
        country_code: '+91',
        otp: trimmedOtp,
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

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#00D2FF" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
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
              <Text style={styles.otpLabel}>Enter 6-Digit OTP</Text>
              
              <View style={styles.otpBoxesRow}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const char = otp[i] || '';
                  const isFull = otp.length === 6;
                  // Active box is either the current input position, the last box when full, or all boxes when completed.
                  const isActive = (isInputFocused && i === otp.length) || (isInputFocused && i === 5 && otp.length === 6) || isFull;

                  return (
                    <Pressable
                      key={i}
                      style={[
                        styles.otpBox,
                        isActive && styles.otpBoxActive,
                        char !== '' && styles.otpBoxFilled,
                      ]}
                      onPress={() => inputRef.current?.focus()}
                    >
                      <Text style={styles.otpBoxText}>{char}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                caretHidden
                autoFocus={true}
              />

              <SizedBox height={30} />

              <CButton
                title="Verify OTP"
                onPress={handleVerify}
                loading={isPending}
                disabled={isPending}
              />
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
          </ScrollView>
        </KeyboardAvoidingView>
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
  otpLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 14,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: '#6C4DF6',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  otpBoxFilled: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    width: 0,
    height: 0,
    opacity: 0,
  },
});
