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
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});
  const [translations, setTranslations] = useState({
    enterEmail: "Please enter your email",
    emailMistyped:
      "Email looks mistyped (e.g. .comc). Please correct it and try again.",
    successMessage:
      "If password reset is configured, reset instructions will be sent to your email.",
    resetPassword: "Reset Password",
    instructions:
      "Enter your email address and we'll send you instructions to reset your password.",
    email: "Email",
    sendResetLink: "Send Reset Link",
  });

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        enterEmail: await t("Please enter your email"),
        emailMistyped: await t(
          "Email looks mistyped (e.g. .comc). Please correct it and try again."
        ),
        successMessage: await t(
          "If password reset is configured, reset instructions will be sent to your email."
        ),
        resetPassword: await t("Reset Password"),
        instructions: await t(
          "Enter your email address and we'll send you instructions to reset your password."
        ),
        email: await t("Email"),
        sendResetLink: await t("Send Reset Link"),
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

    setLoading(true);
    const result = await resetPassword(email.trim().toLowerCase());
    if (result.success) {
      setSnackbarMessage(translations.successMessage);
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
            {translations.instructions}
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
            />
          </View>

          <CustomButton
            title={
              loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                translations.sendResetLink
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
