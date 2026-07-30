import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../utils/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const commentNavigationRef =
    createNavigationContainerRef<RootStackParamList>();
