import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleArgs, Theme } from "../utils/types";
import { useColorScheme, useWindowDimensions } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { key, storage } from "../services/mmkv";
import { useThemeContext } from "../context/themeContext";
import { DarkTheme, LightTheme } from "../utils/constants";



const useStyleArgs = <T>(styleHandler: (styleArgs: StyleArgs) => T) => {
    const insets = useSafeAreaInsets();
    const dims = useWindowDimensions();
    const { isDark } = useThemeContext();

    // Pick theme object based on theme mode from useThemeManager
    const theme = isDark ? DarkTheme : LightTheme;

    return styleHandler({ insets, theme, dims });
};
export default useStyleArgs;


export function useThemeManager() {
    const systemTheme = useColorScheme(); // 'light' | 'dark' | null
    const [theme, setTheme] = useState<Theme>('dark');

    // Load stored theme from MMKV
    useEffect(() => {
        const savedTheme = storage.getString(key.appTheme) as Theme | undefined;
        if (savedTheme === 'dark' || savedTheme === 'light') {
            setTheme(savedTheme);
        } else if (systemTheme) {
            setTheme('dark'); // default to system theme first time
        }
    }, [systemTheme]);

    // Toggle theme
    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            storage.set(key.appTheme, newTheme);
            return newTheme;
        });
    }, []);

    // Explicit set
    const setAppTheme = useCallback((newTheme: Theme) => {
        setTheme(newTheme);
        storage.set(key.appTheme, newTheme);
    }, []);

    return {
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setAppTheme,
    };
}
