import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/services/navigation';
import GlobalProvider from './src/context';
import AppContainer from './src/container';
import { ThemeProvider, useThemeContext } from './src/context/themeContext';
import { DarkTheme, LightTheme } from './src/utils/constants';
import FlashMessage from 'react-native-flash-message';





function App(): React.JSX.Element {
  const { theme, isDark } = useThemeContext();


  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} >
        <StatusBar
          translucent
          barStyle={'dark-content'}
        />
        <GlobalProvider>
          <AppContainer />
        </GlobalProvider>
        <FlashMessage
          statusBarHeight={StatusBar.currentHeight}
          position="top"
          floating
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function Root() {
  return (
    <ThemeProvider  >
      <App />
    </ThemeProvider>
  );
}