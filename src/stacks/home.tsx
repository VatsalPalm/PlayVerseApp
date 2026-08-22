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
import GroundBookingsScreen from '../screens/GroundOwner/GroundBookings';
import BookGroundScreen from '../screens/Player/BookGround';
import MyBookingsScreen from '../screens/Player/MyBookings';
import GroundDetailsScreen from '../screens/Player/GroundDetails';
import MatchHistoryScreen from '../screens/Player/MatchHistory';
import CreateMatchScreen from '../screens/Player/CreateMatch';
import LiveScoringScreen from '../screens/Player/LiveScoring';
import TournamentListScreen from '../screens/Player/TournamentList';
import TournamentDetailsScreen from '../screens/Player/TournamentDetails';
import CreateTournamentScreen from '../screens/Organizer/CreateTournament';
import TeamDetailsScreen from '../screens/Player/TeamDetails';

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
      case 'TOURNAMENT_ORGANIZER':
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
            <Stack.Screen name="GroundBookings" component={GroundBookingsScreen} />
            <Stack.Screen name="BookGround" component={BookGroundScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="GroundDetails" component={GroundDetailsScreen} />
            <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
            <Stack.Screen name="CreateMatch" component={CreateMatchScreen} />
            <Stack.Screen name="LiveScoring" component={LiveScoringScreen} />
            <Stack.Screen name="TournamentList" component={TournamentListScreen} />
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
            <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} />
        </Stack.Navigator>
    );
};

export default Home;