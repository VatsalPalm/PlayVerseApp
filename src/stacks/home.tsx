import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { commonScreenOptions } from '../utils/constants';
import { storage } from '../services/mmkv';
import PlayerHomeScreen from '../screens/Player';
import GroundOwnerHomeScreen from '../screens/GroundOwner';
import OrganizerHomeScreen from '../screens/Organizer';
import AdminHomeScreen from '../screens/Admin';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const Home = () => {
    const userRole = storage.getString('userRole') || 'PLAYER';

    let TargetHomeScreen: React.ComponentType<any> = PlayerHomeScreen;
    switch (userRole) {
      case 'ADMIN':
        TargetHomeScreen = AdminHomeScreen;
        break;
      case 'GROUND_OWNER':
        TargetHomeScreen = GroundOwnerHomeScreen;
        break;
      case 'ORGANIZER':
        TargetHomeScreen = OrganizerHomeScreen;
        break;
      case 'PLAYER':
      default:
        TargetHomeScreen = PlayerHomeScreen;
        break;
    }

    return (
        <Stack.Navigator screenOptions={{ ...commonScreenOptions }}>
            <Stack.Screen name="HomeScreen" component={TargetHomeScreen} />
        </Stack.Navigator>
    );
};

export default Home;