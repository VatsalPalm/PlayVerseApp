import { StyleSheet, Platform } from 'react-native'
import React, { useEffect } from 'react'
import {
    createNativeStackNavigator,
    NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from './utils/types';
import { commonScreenOptions } from './utils/constants';
import * as SplashScreen from 'expo-splash-screen';
import Home from './stacks/home';
import WelcomeScreen from './screens/Welcome';
import LoginScreen from './screens/Login';
import RegisterScreen from './screens/Register';
import OtpScreen from './screens/Otp';
import { storage } from './services/mmkv';
import messaging from '@react-native-firebase/messaging';
import { showMessage } from 'react-native-flash-message';
import { getFcmPushToken } from './utils/helpers';
import DeviceInfo from 'react-native-device-info';
import { fetchRegisterDevice } from './stackApiComponents';

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync();
const AppContainer = () => {

    useEffect(() => {
        const handleSplash = async () => {
            const t = Date.now();
            let timeout = Date.now() - t;
            if (timeout < 2000) timeout += 2000 - timeout;
            setTimeout(SplashScreen.hide, timeout);
        };
        handleSplash();
    }, []);

    useEffect(() => {
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            if (remoteMessage.notification) {
                showMessage({
                    message: remoteMessage.notification.title || "Notification",
                    description: remoteMessage.notification.body || "",
                    type: "success",
                    icon: "success",
                    duration: 4000,
                });
            }
        });
        return unsubscribe;
    }, []);

    const hasToken = storage.contains('accessToken');

    useEffect(() => {
        const registerDeviceToken = async () => {
            if (!hasToken) return;
            try {
                const tokenResult = await getFcmPushToken();
                if (tokenResult) {
                    let brand = 'Generic';
                    let model = 'Device';
                    let os = Platform.OS === 'ios' ? 'ios' : 'android';
                    let osVersion = '1.0';
                    let uniqueId = 'N/A';

                    try {
                        brand = DeviceInfo.getBrand() || brand;
                        model = DeviceInfo.getModel() || model;
                        osVersion = DeviceInfo.getSystemVersion() || osVersion;
                        uniqueId = await DeviceInfo.getUniqueId() || uniqueId;
                    } catch (e) {
                        console.log('Failed to fetch device info on launch:', e);
                    }

                    await fetchRegisterDevice({
                        body: {
                            fcm_token: tokenResult,
                            device_id: uniqueId,
                            platform: os,
                        }
                    });
                    console.log('FCM Device Token registered successfully on launch!');
                }
            } catch (error) {
                console.log('Error registering device token on launch:', error);
            }
        };

        registerDeviceToken();
    }, [hasToken]);
    const initialRouteName = hasToken ? 'Home' : 'Welcome';

    return (
        <>
            <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ ...commonScreenOptions }}>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Otp" component={OtpScreen} />
                <Stack.Screen name="Home" component={Home} />
            </Stack.Navigator>
        </>
    )
}

export default AppContainer

const styles = StyleSheet.create({})