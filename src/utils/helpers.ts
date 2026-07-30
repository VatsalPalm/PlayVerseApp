import { Dimensions, PermissionsAndroid, Platform } from "react-native";
import { FontWeight } from "./types";

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { showMessage } from "react-native-flash-message";
import { getNotificationPermissonRequest } from "../services/mmkv";
import messaging from '@react-native-firebase/messaging';


export const SH = Dimensions.get('window').height;
export const SW = Dimensions.get('window').width;


export const textStyle = (
    fontSize: number,
    fontWeight?: FontWeight,
    color?: string,
) => {
    return {
        fontFamily: RobotoFonts[fontWeight ?? '400'],
        fontSize,
        color,
    };
};

export const RobotoFonts: Record<FontWeight, string> = {
    '100': 'Roboto-Regular',
    '200': 'Roboto-Light',
    '300': 'Roboto-Light',
    '400': 'Roboto-Regular',
    '500': 'Roboto-Medium',
    '600': 'Roboto-Bold',
    '700': 'Roboto-Bold',
    '800': 'Roboto-Bold',
    '900': 'Roboto-Bold',
};

export const options = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
};

export const triggerHaptic = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy', options);
};

export const validatePhone = (phonenumber: any) => {
    const phoneRegEx = /^(?!([0-9])\1{9})(?!1234567890)\d{10}$/;
    return phoneRegEx.test(phonenumber);
};


export const validateOtpValue = (otp: any) => {
    const otpRegEx = /^\d{4}$/;
    return otpRegEx.test(otp);
}

export const validateErrorMsg = (msg: string) => {
    showMessage({
        message: msg,
        description: '',
        type: 'danger',
        icon: 'danger',
    });
};



export const getFcmPushToken = async () => {
    try {


        if (Platform.OS === 'android') {
            if (Platform.Version >= 33) {

                const authStatus = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );

                // ✅ Save flag no matter what (so we never ask again)

                if (authStatus === PermissionsAndroid.RESULTS.GRANTED) {
                    return await messaging().getToken();
                } else {
                    return null;
                }
            } else {

                // No permission needed below Android 13
                return await messaging().getToken();
            }
        } else {
            const authStatus = await messaging().requestPermission();


            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                return await messaging().getToken();
            } else {
                console.log('iOS: Permission denied');
                return null;
            }
        }
    } catch (error) {
        console.log('FCM Token Error:', error);
        return null;
    }
};