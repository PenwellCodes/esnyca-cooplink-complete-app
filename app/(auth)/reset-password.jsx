import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Snackbar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "../../components";
import { typography } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const ResetPassword = () => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { colors } = useTheme();
  const { resetPassword } = useAuth();
  const { currentLanguage, t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});
  const [translations, setTranslations] = useState({
    enterEmail: "Please enter your email",
    emailMistyped:
      "Email looks mistyped (e.g. .comc). Please correct it and try again.",
    successMessage:
      "Reset email sent. Check your inbox for the reset token.",
    resetDone: "Password reset successful. You can login now.",
    resetPassword: "Reset Password",
    instructions:
      "Enter your email address and we'll send you a reset token.",
    confirmInstructions:
      "Enter the token from email and your new password.",
    email: "Email",
    token: "Reset Token",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    sendResetLink: "Send Reset Email",
    submitReset: "Reset Password",
    tokenRequired: "Reset token is required",
    passwordMismatch: "New password and confirm password do not match",
    weakPassword: "New password must be at least 6 characters",
  });

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        enterEmail: await t("Please enter your email"),
        emailMistyped: await t(
          "Email looks mistyped (e.g. .comc). Please correct it and try again."
        ),
        successMessage: await t(
          "Reset email sent. Check your inbox for the reset token."
        ),
        resetDone: await t("Password reset successful. You can login now."),
        resetPassword: await t("Reset Password"),
        instructions: await t(
          "Enter your email address and we'll send you a reset token."
        ),
        confirmInstructions: await t(
          "Enter the token from email and your new password."
        ),
        email: await t("Email"),
        token: await t("Reset Token"),
        newPassword: await t("New Password"),
        confirmNewPassword: await t("Confirm New Password"),
        sendResetLink: await t("Send Reset Email"),
        submitReset: await t("Reset Password"),
        tokenRequired: await t("Reset token is required"),
        passwordMismatch: await t("New password and confirm password do not match"),
        weakPassword: await t("New password must be at least 6 characters"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  const hasCommonEmailTypo = (value) => {
    const email = value.toLowerCase();
    return (
      email.endsWith(".comc") ||
      email.endsWith(".con") ||
      email.includes("@gmal.com") ||
      email.includes("@gmial.com") ||
      email.includes("@gmail.con")
    );
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setSnackbarMessage(translations.enterEmail);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }

    if (hasCommonEmailTypo(email.trim())) {
      setSnackbarMessage(translations.emailMistyped);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }

    if (step === "confirm") {
      if (!resetToken.trim()) {
        setSnackbarMessage(translations.tokenRequired);
        setSnackbarStyle({ backgroundColor: "red" });
        setSnackbarVisible(true);
        return;
      }
      if (newPassword.length < 6) {
        setSnackbarMessage(translations.weakPassword);
        setSnackbarStyle({ backgroundColor: "red" });
        setSnackbarVisible(true);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setSnackbarMessage(translations.passwordMismatch);
        setSnackbarStyle({ backgroundColor: "red" });
        setSnackbarVisible(true);
        return;
      }
    }

    setLoading(true);
    const result = await resetPassword(
      step === "request"
        ? {
            step: "request",
            email: email.trim().toLowerCase(),
          }
        : {
            step: "reset",
            email: email.trim().toLowerCase(),
            token: resetToken.trim(),
            newPassword,
          }
    );
    if (result.success) {
      setSnackbarMessage(step === "request" ? translations.successMessage : translations.resetDone);
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);
      if (step === "request") {
        setStep("confirm");
      } else {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } else {
      setSnackbarMessage(result.error);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={insets.top + 8}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 24 + keyboardHeight + Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.header}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.primary}
            style={styles.backIcon}
            onPress={() => router.back()}
          />
          <Text style={[styles.title, typography.title, { color: colors.primary }]}>
            {translations.resetPassword}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={[typography.body, styles.instructions]}>
            {step === "request" ? translations.instructions : translations.confirmInstructions}
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <TextInput
              placeholder={translations.email}
              style={[styles.input, typography.body, { color: colors.onSurface }]}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={step === "request"}
            />
          </View>

          {step === "confirm" && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
                <TextInput
                  placeholder={translations.token}
                  style={[styles.input, typography.body, { color: colors.onSurface }]}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                <TextInput
                  placeholder={translations.newPassword}
                  style={[styles.input, typography.body, { color: colors.onSurface }]}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <TextInput
                  placeholder={translations.confirmNewPassword}
                  style={[styles.input, typography.body, { color: colors.onSurface }]}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                />
              </View>
            </>
          )}

          <CustomButton
            title={
              loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                step === "request" ? translations.sendResetLink : translations.submitReset
              )
            }
            onPress={handleResetPassword}
            disabled={loading}
          />
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={snackbarStyle}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingBottom: 24,
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
