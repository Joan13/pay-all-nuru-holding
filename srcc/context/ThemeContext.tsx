import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeContextType = {
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  colorScheme: 'light' | 'dark' | null | undefined;
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: () => {},
  colorScheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  const colorScheme = themeMode === 'system' ? systemTheme : themeMode;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
