// themes.js
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00AAFF',
    secondary: '#ffffff',
    tertiary: '#424651',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#C1B8C8',
    success: '#FF0000',
    links: '#3590F3',
    secondaryContainer: '#00AAFF',
    surfaceVariant: '#000000',
  },
  // Add other theme properties if needed
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#CDD3CE',
    secondary: '#CDD3CE',
    tertiary: '#CDD3CE',
    background: '#000501',
    surface: '#000501',
    error: '#C1B8C8',
    links: '#8ab4f8',
    secondaryContainer: '#00AAFF',
    surfaceVariant: '#1f1f1f',
  },
  // Add other theme properties if needed
};
