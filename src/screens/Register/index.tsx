import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/types';
import CTextInput from '../../Components/atoms/CTextInput';
import CImage from '../../Components/atoms/CImage';
import SizedBox from '../../Components/atoms/SizeBox';
import { Icons } from '../../assets';
import { useAuthControllerRegister, useUploadControllerUploadFile } from '../../Api/educationApiComponents';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import DeviceInfo from 'react-native-device-info';
import { getFcmPushToken } from '../../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPORTS_LIST = [
  { id: 1, name: 'Cricket', icon: '🏏' },
  { id: 2, name: 'Pickleball', icon: '🏓' },
  { id: 3, name: 'Football', icon: '⚽' },
  { id: 4, name: 'Badminton', icon: '🏸' },
];

const RegisterScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedSports, setSelectedSports] = useState<number[]>([]);

  const toggleSport = (sportId: number) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter(id => id !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const { mutate: uploadFile, isPending: isUploading } = useUploadControllerUploadFile({
    onSuccess: (data: any) => {
      console.log('Upload success data:', data);
      const url = data?.url || data?.path;
      if (url) {
        setUploadedImageUrl(url);
        showMessage({
          message: 'Profile Photo Uploaded',
          description: 'Your photo was uploaded successfully.',
          type: 'success',
        });
      } else {
        showMessage({
          message: 'Upload Succeeded',
          description: 'Photo updated.',
          type: 'success',
        });
      }
    },
    onError: (error: any) => {
      console.log('Upload error:', error);
      showMessage({
        message: 'Upload Failed',
        description: 'Could not upload profile picture. Please try again.',
        type: 'danger',
      });
    }
  });

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage({
          message: 'Permission Denied',
          description: 'Sorry, we need camera roll permissions to upload profile picture.',
          type: 'warning',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setProfileImage(localUri);

        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'android' ? localUri : localUri.replace('file://', ''),
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);

        uploadFile({
          body: formData as any,
          queryParams: {
            type: 'profile',
          }
        });
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  };

  const { mutate: register, isPending } = useAuthControllerRegister({
    onSuccess: (data: any) => {
      showMessage({
        message: 'Registration Initiated',
        description: 'An OTP has been sent to your mobile number. Please verify to continue.',
        type: 'info',
        icon: 'info',
        duration: 4000,
      });
      // Navigate to OTP screen. We pass mobileNumber and token
      navigation.navigate('Otp', { mobileNumber: phone.trim(), token: data?.token || '' });
    },
    onError: (error: any) => {
      console.log('Registration error:', error);
      let errMsg = 'Registration failed. Check parameters and try again.';
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
        message: 'Registration Failed',
        description: errMsg,
        type: 'danger',
        icon: 'danger',
      });
    }
  });

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      showMessage({
        message: 'Required Fields',
        description: 'Please fill in all standard details.',
        type: 'warning',
      });
      return;
    }

    if (password !== confirmPassword) {
      showMessage({
        message: 'Password Mismatch',
        description: 'Passwords do not match.',
        type: 'warning',
      });
      return;
    }

    if (selectedSports.length === 0) {
      showMessage({
        message: 'Select Sport',
        description: 'Please select at least one sport of interest.',
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

    register({
      body: {
        full_name: fullName.trim(),
        display_name: fullName.trim(),
        email: email.trim(),
        country_code: '+91',
        phone_number: phone.trim(),
        mobile_number: phone.trim(),
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        profile_image: uploadedImageUrl || "https://example.com/profiles/rajesh.jpg",
        auth_type: 'Local',
        app_type: 'App',
        os,
        brand,
        model_no: model,
        serial_number: uniqueId,
        version_number: osVersion,
        fcm_token: fcmToken,
        area_of_interest: selectedSports,
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

          {/* Logo */}
          <CImage source={Icons.crmLogo} style={styles.logoImage} resizeMode="contain" />

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enter your details and select your sports to join PlayVerse.</Text>
          </View>

          <SizedBox height={20} />

          {/* Profile Image Picker */}
          <TouchableOpacity 
            style={styles.avatarContainer} 
            activeOpacity={0.8}
            onPress={handlePickImage}
            disabled={isUploading}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderEmoji}>👤</Text>
                <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
              </View>
            )}
            
            {isUploading && (
              <View style={styles.uploadSpinnerContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>📸</Text>
            </View>
          </TouchableOpacity>

          <SizedBox height={20} />

          {/* Form */}
          <View style={styles.form}>
            <CTextInput
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeTextValue={setFullName}
            />

            <SizedBox height={16} />

            <CTextInput
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeTextValue={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <SizedBox height={16} />

            <CTextInput
              label="Phone Number"
              placeholder="Enter 10-digit number"
              value={phone}
              onChangeTextValue={setPhone}
              keyboardType="phone-pad"
            />

            <SizedBox height={16} />

            <CTextInput
              label="Password"
              placeholder="Min 8 characters, with capital & symbol"
              value={password}
              onChangeTextValue={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <SizedBox height={16} />

            <CTextInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeTextValue={setConfirmPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <SizedBox height={20} />

            {/* Choose Sports Section */}
            <View style={styles.sportsSection}>
              <Text style={styles.sportsLabel}>Choose Your Sports</Text>
              <View style={styles.chipsContainer}>
                {SPORTS_LIST.map((sport) => {
                  const isSelected = selectedSports.includes(sport.id);
                  return (
                    <TouchableOpacity
                      key={sport.id}
                      activeOpacity={0.8}
                      onPress={() => toggleSport(sport.id)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive
                      ]}
                    >
                      <Text style={styles.chipEmoji}>{sport.icon}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {sport.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <SizedBox height={30} />

            <TouchableOpacity
              style={styles.btnRegister}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnRegisterText}>Register</Text>
              )}
            </TouchableOpacity>
          </View>

          <SizedBox height={20} />

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#6C4DF6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderEmoji: {
    fontSize: 32,
    marginBottom: 2,
  },
  avatarPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C4DF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#080612',
  },
  avatarBadgeText: {
    fontSize: 14,
  },
  uploadSpinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.22,
    marginTop: 10,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  sportsSection: {
    marginHorizontal: SCREEN_WIDTH * 0.043,
    marginTop: 8,
  },
  sportsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    borderColor: '#6C4DF6',
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnRegister: {
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
  btnRegisterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
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
