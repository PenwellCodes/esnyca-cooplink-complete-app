import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme, Snackbar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "../../components";
import { typography } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext";
import { useRouter } from "expo-router";

const ResetPassword = () => {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setSnackbarMessage("Please enter your email");
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    const result = await resetPassword(email.trim());
    if (result.success) {
      setSnackbarMessage("Password reset email sent! Check your inbox.");
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);
      setTimeout(() => {
        router.back();
      }, 3000);
    } else {
      setSnackbarMessage(result.error);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.primary}
          style={styles.backIcon}
          onPress={() => router.back()}
        />
        <Text style={[styles.title, typography.title, { color: colors.primary }]}>
          Reset Password
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={[typography.body, styles.instructions]}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <TextInput
            placeholder="Email"
            style={[styles.input, typography.body]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <CustomButton
          title={loading ? <ActivityIndicator size="small" color="#fff" /> : "Send Reset Link"}
          onPress={handleResetPassword}
          disabled={loading}
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={snackbarStyle}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    textAlign: "center",
    marginTop: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
  },
  instructions: {
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    marginBottom: 30,
  },
  input: {
    flex: 1,
    marginLeft: 10,
  },
});

export default ResetPassword;
