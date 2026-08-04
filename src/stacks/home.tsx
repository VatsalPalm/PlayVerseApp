import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { commonScreenOptions } from '../utils/constants';
import { storage } from '../services/mmkv';
import PlayerHomeScreen from '../screens/Player';
import GroundOwnerHomeScreen from '../screens/GroundOwner';
import OrganizerHomeScreen from '../screens/Organizer';
import AdminHomeScreen from '../screens/Admin';
import GroundsListScreen from '../screens/GroundOwner/GroundsList';
import AddEditGroundScreen from '../screens/GroundOwner/AddEditGround';
import ManageSlotsScreen from '../screens/GroundOwner/ManageSlots';
import EditProfileScreen from '../screens/GroundOwner/EditProfile';

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
            <Stack.Screen name="GroundsList" component={GroundsListScreen} />
            <Stack.Screen name="AddEditGround" component={AddEditGroundScreen} />
            <Stack.Screen name="ManageSlots" component={ManageSlotsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Navigator>
    );
};

export default Home;