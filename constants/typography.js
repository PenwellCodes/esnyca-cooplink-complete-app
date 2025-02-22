import { StyleSheet } from "react-native";

const typography = StyleSheet.create({
  // Font Families
  robotoBlack: {
    fontFamily: "Poppins-Black",
  },
  robotoBold: {
    fontFamily: "Poppins-Bold",
  },
  robotoMedium: {
    fontFamily: "Poppins-Medium",
  },
  robotoRegular: {
    fontFamily: "Poppins-Regular",
  },
  robotoLight: {
    fontFamily: "Poppins-Light",
  },

  // Font Sizes
  title: {
    fontSize: 25,
    fontWeight: 400,
  },
  title2: {
    fontSize: 46,
    fontWeight: 400,
  },
  subtitle: {
    fontSize: 20,
  },
  body: {
    fontSize: 16,
  },
  small: {
    fontSize: 14,
  },

  // Colors
  blackText: {
    color: "#000000",
  },
  greyText: {
    color: "#858585",
  },
  primaryText: {
    color: "#0286FF",
  },
});

export default typography;
