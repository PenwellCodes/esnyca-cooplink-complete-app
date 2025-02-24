import React, { createContext, useState, useContext } from 'react';
import { DefaultTheme, DarkTheme } from 'react-native-paper';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#191970',
      tertiary: '#ffffff',
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#191970',
      tertiary: '#000000',
    },
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme, dark: isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
