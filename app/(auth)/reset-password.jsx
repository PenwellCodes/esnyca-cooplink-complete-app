import React, { useState, useRef } from "react";
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
  const [inputPositions, setInputPositions] = useState({});
  const scrollViewRef = useRef(null);
  const [translations, setTranslations] = useState({
    enterEmail: "Please enter your email",
    emailMistyped:
      "Email looks mistyped (e.g. .comc). Please correct it and try again.",
    successMessage:
      "Reset email sent. Check your inbox for the Firebase password reset link.",
    resetDone: "Password reset email sent.",
    resetPassword: "Reset Password",
    instructions:
      "Enter your email address and we'll send you a Firebase reset link.",
    email: "Email",
    sendResetLink: "Send Reset Email",
  });

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        enterEmail: await t("Please enter your email"),
        emailMistyped: await t(
          "Email looks mistyped (e.g. .comc). Please correct it and try again."
        ),
        successMessage: await t(
          "Reset email sent. Check your inbox for the Firebase password reset link."
        ),
        resetDone: await t("Password reset email sent."),
        resetPassword: await t("Reset Password"),
        instructions: await t(
          "Enter your email address and we'll send you a Firebase reset link."
        ),
        email: await t("Email"),
        sendResetLink: await t("Send Reset Email"),
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
    const result = await resetPassword({
      step: "request",
      email: email.trim().toLowerCase(),
    });
    if (result.success) {
      setSnackbarMessage(translations.successMessage);
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
      setSnackbarMessage(result.error);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    }
  };
  const handleInputLayout = (key) => (event) => {
    const { y } = event.nativeEvent.layout;
    setInputPositions((prev) => ({ ...prev, [key]: y }));
  };

  const scrollToInput = (key) => {
    const y = inputPositions[key];
    if (typeof y !== "number") return;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 24}
    >
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 32 + keyboardHeight + Math.max(insets.bottom, 12),
          },
        ]}
        bounces={false}
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

          <View style={styles.inputContainer} onLayout={handleInputLayout("email")}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <TextInput
              placeholder={translations.email}
              style={[styles.input, typography.body, { color: colors.onSurface }]}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              onFocus={() => scrollToInput("email")}
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
