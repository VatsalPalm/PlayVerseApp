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

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync();
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const AppContainer = (props: Props) => {

    useEffect(() => {
        const handleSplash = async () => {
            const t = Date.now();
            let timeout = Date.now() - t;
            if (timeout < 2000) timeout += 2000 - timeout;
            setTimeout(SplashScreen.hide, timeout);
        };
        handleSplash();
    }, []);

    return (
        <>
            <Stack.Navigator screenOptions={{ ...commonScreenOptions }}>
                <Stack.Screen name="Home" component={Home} />
            </Stack.Navigator>
        </>
    )
}

export default AppContainer

const styles = StyleSheet.create({})