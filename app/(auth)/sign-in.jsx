import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Snackbar, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "./../../components";
import { typography, images } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext"; 
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const SignIn = () => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { colors } = useTheme();
  const { login } = useAuth();
  const { currentLanguage, t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});
  const [translations, setTranslations] = useState({
    successSignedIn: "Successfully signed in!",
    wrongPasswordOrEmail: "Wrong password or email",
    chatCorner: "CHAT CORNER",
    email: "Email",
    password: "Password",
    forgetPassword: "Forget password?",
    signIn: "SIGN IN",
    noAccount: "DON'T HAVE AN ACCOUNT?",
    signUpNow: "SIGN UP NOW",
  });

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        successSignedIn: await t("Successfully signed in!"),
        wrongPasswordOrEmail: await t("Wrong password or email"),
        chatCorner: await t("CHAT CORNER"),
        email: await t("Email"),
        password: await t("Password"),
        forgetPassword: await t("Forget password?"),
        signIn: await t("SIGN IN"),
        noAccount: await t("DON'T HAVE AN ACCOUNT?"),
        signUpNow: await t("SIGN UP NOW"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  const handleSignIn = async () => {
    setLoading(true);
    const result = await login(email.trim(), password);
    if (result.success) {
      setSnackbarMessage(translations.successSignedIn);
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);
      setTimeout(() => {
        // If returnTo is provided, decode and navigate to it, otherwise go to home
        if (returnTo) {
          router.replace(decodeURIComponent(returnTo));
        } else {
          router.replace("/(tabs)/home");
        }
      }, 1500);
    } else {
      if (
        result.error.toLowerCase().includes("invalid") ||
        result.error.toLowerCase().includes("not found")
      ) {
        setSnackbarMessage(translations.wrongPasswordOrEmail);
      } else {
        setSnackbarMessage(result.error);
      }
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
      <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
        <Ionicons name="arrow-back" size={24} color={colors.background} />
      </TouchableOpacity>

      <ScrollView
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
        <View style={[styles.topSection, { backgroundColor: colors.primary }]}>
          <Image source={images.logo} style={styles.logo} />
          <Text style={[styles.title, typography.title, { color: colors.background }]}>
            {translations.chatCorner}
          </Text>
        </View>

        <View style={styles.formContainer}>
        <TextInput
          mode="outlined"
          label={translations.email}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          left={<TextInput.Icon icon="email" color={colors.primary} />}
        />

        <TextInput
          mode="outlined"
          label={translations.password}
          secureTextEntry={hidePassword}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          left={<TextInput.Icon icon="lock" color={colors.primary} />}
          right={
            <TextInput.Icon
              icon={hidePassword ? "eye-off" : "eye"}
              onPress={() => setHidePassword((prev) => !prev)}
            />
          }
        />

        <TouchableOpacity onPress={() => router.push("/(auth)/reset-password")}>
          <Text style={[styles.forgotPassword, typography.small, { color: colors.primary }]}>
            {translations.forgetPassword}
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <CustomButton
          title={
            loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              translations.signIn
            )
          }
          onPress={handleSignIn}
          disabled={loading}
        />

        {/* Sign Up Link */}
        <TouchableOpacity
          onPress={() =>
            returnTo
              ? router.push(`/(auth)/sign-up?returnTo=${returnTo}`)
              : router.push("/(auth)/sign-up")
          }
        >
          <Text style={{ color: colors.error }}>
            {`${translations.noAccount} `}
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              {translations.signUpNow}
            </Text>
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Snackbar for feedback */}
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
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    minHeight: 260,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  backIcon: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  title: { marginTop: 10 },
  formContainer: { padding: 20, paddingTop: 24 },
  input: { 
    marginBottom: 15,
    backgroundColor: 'transparent'
  },
  inputContainer: {
    // Remove or comment out the old inputContainer style
  },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 20 },
  rememberContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: "#000", marginRight: 10 },
  signUpText: { textAlign: "center", marginTop: 20 },
});

export default SignIn;
