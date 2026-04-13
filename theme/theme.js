import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Light theme (default)
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
    // Readable body / TextInput text (was washed out with wrong surfaceVariant + defaults)
    onSurface: '#1C1B1F',
    onBackground: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    error: '#B3261E',
    success: '#FF0000',
    links: '#3590F3',
    secondaryContainer: '#00AAFF',
    // Must stay a light surface tone — black here broke Paper outlined inputs (grey/muddy text)
    surfaceVariant: MD3LightTheme.colors.surfaceVariant,
    backdrop: 'rgba(0,0,0,0.6)',
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00AAFF',
    secondary: '#AAB2BA',
    tertiary: '#AAB2BA',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#C1B8C8',
    links: '#8ab4f8',
    secondaryContainer: '#005F99',
    surfaceVariant: '#2A2A2A',
    backdrop: 'rgba(0,0,0,0.7)',
  },
};

export default lightTheme;