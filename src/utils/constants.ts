import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";

export const commonScreenOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: Platform.OS === 'android' ? 'slide_from_right' : undefined,
};


export const isIos = Platform.OS == 'ios';


export const DarkTheme = {
    colors: {
        primary: '#6C4DF6',
        white: '#FFFFFF',
        black: '#0B0914',
        red: '#FF3E3E',
        green: '#00E676',
        background: '#0B0914',
        placeholderColor: '#9CA3AF',
        textColor: '#FFFFFF',
        buttonBackground: '#6C4DF6',
        inputBackground: 'rgba(255, 255, 255, 0.04)',
        inputBorder: 'rgba(255, 255, 255, 0.08)',
        grey: "#9CA3AF"
    },
    dark: true,
}

export const LightTheme = {
    colors: {
        primary: '#6C4DF6',
        white: '#FFFFFF',
        black: '#0B0914',
        placeholderColor: '#9CA3AF',
        red: '#FF3E3E',
        green: '#00E676',
        background: '#0B0914',
        textColor: '#FFFFFF',
        buttonBackground: '#6C4DF6',
        inputBackground: 'rgba(255, 255, 255, 0.04)',
        inputBorder: 'rgba(255, 255, 255, 0.08)',
        grey: "#9CA3AF"
    },
    dark: true,
};


