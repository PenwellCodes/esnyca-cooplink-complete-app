import { MD3LightTheme } from "react-native-paper";

const theme = {
  ...MD3LightTheme,
  roundness: 6,

  colors: {
    ...MD3LightTheme.colors,
    primary: "#00AAFF",
    secondary: "#ffffff",
    tertiary: "#424651",
    background: "#ffffff",
    surface: "#ffffff",
    error: "#FF0000",
    links: "#3590F3",
    secondaryContainer: "#09814a",
    surfaceVariant: "#000000",
  },
  elevation: {
    level0: "transparent",
    level1: "rgb(248, 242, 251)",
    level2: "#3ae02160",
    level3: "#3ae02121",
    level4: "rgb(239, 229, 245)",
    level5: "rgb(236, 226, 243)",
  },
};

export default theme;
