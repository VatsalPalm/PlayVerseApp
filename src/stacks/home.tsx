import { StyleSheet } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { commonScreenOptions } from '../utils/constants';
import HomeScreen from '../screens/Home';

const Stack = createNativeStackNavigator<HomeStackParamList>();


const Home = () => {

    return (
        <Stack.Navigator screenOptions={{ ...commonScreenOptions }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />

        </Stack.Navigator>
    )
}

export default Home

const styles = StyleSheet.create({})