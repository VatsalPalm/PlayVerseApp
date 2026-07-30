// themeContext.tsx
import React, { createContext, useContext } from 'react';
import { useThemeManager } from '../hooks';

type ThemeContextType = ReturnType<typeof useThemeManager>;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const themeManager = useThemeManager();
    return (
        <ThemeContext.Provider value={themeManager}>
            {children}
        </ThemeContext.Provider>
    );
};

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context)
        throw new Error('useThemeContext must be used inside ThemeProvider');
    return context;
}
