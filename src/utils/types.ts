import { NavigatorScreenParams } from '@react-navigation/native';
import { DarkTheme, LightTheme } from './constants';
import { ScaledSize } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';


export type StyleArgs = {
    theme: typeof LightTheme | typeof DarkTheme;
    dims: ScaledSize;
    insets: EdgeInsets;
};


export type HomeStackParamList = {
    HomeScreen: undefined;
    GroundsList: undefined;
    AddEditGround: { groundId?: number };
    ManageSlots: { groundId: number };
    EditProfile: undefined;
}

export type RootStackParamList = {
    Welcome: undefined;
    Login: undefined;
    Register: undefined;
    Otp: { mobileNumber: string; token: string };
    Home: NavigatorScreenParams<HomeStackParamList>;
};

export type Theme = 'dark' | 'light' | 'system';


export type FontWeight =
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';


export enum METHODS {
    GET = 'Get',
    POST = 'Post',
    PUT = 'Put',
    DELETE = 'Delete',
    PATCH = 'Patch',
}

export enum Sports {
    CRICKET = 1,
    FOOTBALL = 2,
    BASKETBALL = 3,
    TENNIS = 4,
    PICKLEBALL = 5,
}


