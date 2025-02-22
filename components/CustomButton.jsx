import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { typography } from "../constants";

const CustomButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#03240E" />
        </>
      ) : (
        <Text
          style={[
            typography.robotoBold,
            typography.small,
            { color: colors.background },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
  },
});

export default CustomButton;
