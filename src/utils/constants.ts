import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";

export const commonScreenOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: Platform.OS === 'android' ? 'slide_from_right' : undefined,
};


export const isIos = Platform.OS == 'ios';


export const DarkTheme: typeof LightTheme = {
    colors: {
        primary: '',
        white: '#FFFFFF',
        black: '#1E1E1E',
        red: '#FF3E3E',
        green: '#43BE24',
        background: '#FFFFFF',
        placeholderColor: '#C7CED5',
        textColor: '#505050',
        buttonBackground: '#0E63FB',
        inputBackground: '#FDFDFD',
        inputBorder: '#EFF0F6',
        grey: "#808080"

    },
    dark: true,
}


export const LightTheme = {
    colors: {
        primary: '',
        white: '#FFFFFF',
        black: '#1E1E1E',
        placeholderColor: '#C7CED5',
        red: '#FF3E3E',
        green: '#43BE24',
        background: '#FFFFFF',
        textColor: '#505050',
        buttonBackground: '#0E63FB',
        inputBackground: '#FDFDFD',
        inputBorder: '#EFF0F6',
        grey: "#808080"


    },
    dark: true,
};


