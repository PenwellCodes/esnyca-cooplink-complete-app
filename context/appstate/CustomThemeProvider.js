// CustomThemeProvider.js
import React, { createContext, useState, useContext } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../../theme/theme';

const ThemeContext = createContext();

export const useCustomTheme = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
    const [isDarkTheme, setIsDarkTheme] = useState(false); // Default to light theme

    const toggleTheme = () => {
        setIsDarkTheme((prev) => !prev);
    };

    const theme = isDarkTheme ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ toggleTheme, isDarkTheme }}>
            <PaperProvider theme={theme}>{children}</PaperProvider>
        </ThemeContext.Provider>
    );
};
