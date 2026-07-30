import { StyleSheet } from 'react-native'
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

    const hasToken = storage.contains('accessToken');
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