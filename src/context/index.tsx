
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const GlobalProvider = ({ children }: any) => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    )
}


export default GlobalProvider;