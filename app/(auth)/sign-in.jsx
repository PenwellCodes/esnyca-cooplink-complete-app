import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { useTheme, Snackbar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "./../../components";
import { typography, images } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext"; 
import { useRouter } from "expo-router";

const SignIn = () => {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});

  const handleSignIn = async () => {
    setLoading(true);
    const result = await login(email.trim(), password);
    if (result.success) {
      setSnackbarMessage("Successfully signed in!");
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);
      setTimeout(() => {
        router.replace("/(tabs)/home"); // redirect to home page
      }, 1500);
    } else {
      setSnackbarMessage(result.error);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Section */}
      <View style={[styles.topSection, { backgroundColor: colors.primary }]}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.background}
          style={styles.backIcon}
        />
        <Image source={images.logo} style={styles.logo} />
        <Text style={[styles.title, typography.title, { color: colors.background }]}>
          CHAT CORNER
        </Text>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <TextInput
            placeholder="Email"
            style={[styles.input, typography.body]}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={[styles.input, typography.body]}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/reset-password")}>
          <Text style={[styles.forgotPassword, typography.small, { color: colors.primary }]}>
            Forget password?
          </Text>
        </TouchableOpacity>

    

        {/* Sign In Button */}
        <CustomButton
          title={
            loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              "SIGN IN"
            )
          }
          onPress={handleSignIn}
          disabled={loading}
        />

        {/* Sign Up Link */}
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={[styles.signUpText, typography.small]}>
            DON'T HAVE AN ACCOUNT?{" "}
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              SIGN UP NOW
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Snackbar for feedback */}
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
  container: { flex: 1 },
  topSection: {
    height: "35%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  backIcon: { position: "absolute", top: 40, left: 20 },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  title: { marginTop: 10 },
  formContainer: { flex: 1, padding: 20, justifyContent: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    marginBottom: 20,
  },
  input: { flex: 1, marginLeft: 10 },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 20 },
  rememberContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: "#000", marginRight: 10 },
  signUpText: { textAlign: "center", marginTop: 20 },
});

export default SignIn;
