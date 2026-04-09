import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme, Snackbar, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "./../../components";
import { typography, images } from "../../constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useAuth } from "../../context/appstate/AuthContext";

const TOP_SECTION_HEIGHT = 180;

const SignUp = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();
  const { register } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;

  // Registration role: individual or cooperative
  const [role, setRole] = useState("individual");

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    registrationNumber: "", // For cooperatives
    physicalAddress: "",
    region: "", // For cooperatives
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);

  // New state for profile picture URI
  const [profilePic, setProfilePic] = useState(null);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});

  // Loading state for ActivityIndicator
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState({
    fillEmailPassword: "Please fill in email and password",
    emailMistyped: "Email looks mistyped (e.g. .comc). Please correct it.",
    passwordsNotMatch: "Passwords do not match",
    registrationExists: "Registration number already exists",
    coopSuccess: "Cooperative successfully registered. Confirmation email sent.",
    individualSuccess: "Individual successfully registered. Confirmation email sent.",
    weakPassword: "At least password must be 6 characters",
    registerAs: "Register as",
    individual: "Individual",
    cooperative: "Cooperative",
    name: "Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    cooperativeName: "Cooperative Name",
    registrationNumber: "Registration Number",
    physicalAddress: "Physical Address",
    region: "Region",
    selectRegion: "Select Region",
    uploadProfile: "Upload Profile",
    registerAsFmt: "Register as",
    chatCorner: "CHAT CORNER",
  });

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        fillEmailPassword: await t("Please fill in email and password"),
        emailMistyped: await t(
          "Email looks mistyped (e.g. .comc). Please correct it."
        ),
        passwordsNotMatch: await t("Passwords do not match"),
        registrationExists: await t("Registration number already exists"),
        coopSuccess: await t(
          "Cooperative successfully registered. Confirmation email sent."
        ),
        individualSuccess: await t(
          "Individual successfully registered. Confirmation email sent."
        ),
        weakPassword: await t("At least password must be 6 characters"),
        registerAs: await t("Register as"),
        individual: await t("Individual"),
        cooperative: await t("Cooperative"),
        name: await t("Name"),
        email: await t("Email"),
        password: await t("Password"),
        confirmPassword: await t("Confirm Password"),
        cooperativeName: await t("Cooperative Name"),
        registrationNumber: await t("Registration Number"),
        physicalAddress: await t("Physical Address"),
        region: await t("Region"),
        selectRegion: await t("Select Region"),
        uploadProfile: await t("Upload Profile"),
        registerAsFmt: await t("Register as"),
        chatCorner: await t("CHAT CORNER"),
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

  const handleInputChange = (field, value) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: field === "email" ? value.trim() : value,
    }));
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  // Helper to extract file name from URI
  const getFileName = (uri) => uri.split("/").pop();

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      setSnackbarMessage(translations.fillEmailPassword);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }
    if (hasCommonEmailTypo(formData.email.trim())) {
      setSnackbarMessage(translations.emailMistyped);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }
    if (formData.password !== confirmPassword) {
      setSnackbarMessage(translations.passwordsNotMatch);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: role,
        displayName: formData.displayName,
        phoneNumber: "",
      };

      if (role === "cooperative") {
        Object.assign(payload, {
          registrationNumber: formData.registrationNumber,
          physicalAddress: formData.physicalAddress,
          region: formData.region,
        });
      }

      if (profilePic) {
        payload.profilePic = {
          uri: profilePic,
          name: getFileName(profilePic) || `profile-${Date.now()}.jpg`,
          type: "image/jpeg",
        };
      }

      const result = await register(payload);
      if (!result.success) {
        throw new Error(result.error || "Registration failed");
      }

      setSnackbarMessage(
        role === "cooperative"
          ? translations.coopSuccess
          : translations.individualSuccess,
      );
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);

      setTimeout(() => {
        if (returnTo) {
          router.replace(decodeURIComponent(returnTo));
        } else {
          router.replace("/(tabs)/home");
        }
      }, 1500);
    } catch (error) {
      if (
        error.message.toLowerCase().includes("password") &&
        error.message.toLowerCase().includes("short")
      ) {
        setSnackbarMessage(translations.weakPassword);
      } else if (
        error.message.toLowerCase().includes("already exists") ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        setSnackbarMessage(translations.registrationExists);
      } else {
        setSnackbarMessage(error.message);
      }
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: TOP_SECTION_HEIGHT, paddingBottom: insets.bottom + 12 },
          ]}
          scrollEnabled={role === "cooperative"}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text
              style={[
                styles.appName,
                typography.robotoBold,
                typography.title,
                { color: colors.tertiary },
              ]}
            >
              {translations.registerAs}
            </Text>
          </View>

          {/* Toggle Buttons */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                role === "individual" && styles.activeButton,
              ]}
              onPress={() => setRole("individual")}
            >
              <Text style={[styles.toggleButtonText, typography.body]}>
                {translations.individual}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                role === "cooperative" && styles.activeButton,
              ]}
              onPress={() => setRole("cooperative")}
            >
              <Text style={[styles.toggleButtonText, typography.body]}>
                {translations.cooperative}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {role === "individual" ? (
              <>
                <TextInput
                  mode="outlined"
                  label={translations.name}
                  value={formData.displayName}
                  onChangeText={(value) =>
                    handleInputChange("displayName", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={translations.email}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={translations.password}
                  secureTextEntry={hidePassword}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  style={styles.input}
                  right={
                    <TextInput.Icon
                      icon={hidePassword ? "eye-off" : "eye"}
                      onPress={() => setHidePassword((prev) => !prev)}
                    />
                  }
                />
                <TextInput
                  mode="outlined"
                  label={translations.confirmPassword}
                  secureTextEntry={hideConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  right={
                    <TextInput.Icon
                      icon={hideConfirmPassword ? "eye-off" : "eye"}
                      onPress={() => setHideConfirmPassword((prev) => !prev)}
                    />
                  }
                />
              </>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label={translations.cooperativeName}
                  value={formData.displayName}
                  onChangeText={(value) =>
                    handleInputChange("displayName", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={translations.registrationNumber}
                  value={formData.registrationNumber}
                  onChangeText={(value) =>
                    handleInputChange("registrationNumber", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={translations.physicalAddress}
                  value={formData.physicalAddress}
                  onChangeText={(value) =>
                    handleInputChange("physicalAddress", value)
                  }
                  style={styles.input}
                />
                <View style={styles.pickerContainer}>
                  <Text style={[styles.pickerLabel, { color: colors.text }]}>
                    {translations.region}
                  </Text>
                  <Picker
                    selectedValue={formData.region}
                    style={[styles.picker, { flex: 1 }]}
                    onValueChange={(value) =>
                      handleInputChange("region", value)
                    }
                  >
                    <Picker.Item label={translations.selectRegion} value="" />
                    <Picker.Item label="Hhohho" value="Hhohho" />
                    <Picker.Item label="Manzini" value="Manzini" />
                    <Picker.Item label="Shiselweni" value="Shiselweni" />
                    <Picker.Item label="Lubombo" value="Lubombo" />
                  </Picker>
                </View>
                <TextInput
                  mode="outlined"
                  label={translations.email}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={translations.password}
                  secureTextEntry={hidePassword}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  style={styles.input}
                  right={
                    <TextInput.Icon
                      icon={hidePassword ? "eye-off" : "eye"}
                      onPress={() => setHidePassword((prev) => !prev)}
                    />
                  }
                />
                <TextInput
                  mode="outlined"
                  label={translations.confirmPassword}
                  secureTextEntry={hideConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  right={
                    <TextInput.Icon
                      icon={hideConfirmPassword ? "eye-off" : "eye"}
                      onPress={() => setHideConfirmPassword((prev) => !prev)}
                    />
                  }
                />
              </>
            )}

            {/* Profile Picture Upload Section */}
            <View style={styles.uploadContainer}>
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.uploadButton, { borderColor: colors.primary }]}
              >
                <Ionicons
                  name="attach-outline"
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.uploadButtonText, { color: colors.primary }]}
                >
                  {translations.uploadProfile}
                </Text>
              </TouchableOpacity>
              {profilePic && (
                <Text style={[styles.fileName, { color: colors.text }]}>
                  {getFileName(profilePic)}
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <CustomButton
              disabled={loading}
              onPress={handleSubmit}
              style={{ marginBottom: Math.max(insets.bottom, 8) }}
              title={
                loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  `${translations.registerAsFmt} ${
                    role === "individual"
                      ? translations.individual
                      : translations.cooperative
                  }`
                )
              }
            />
          </View>
        </ScrollView>

        {/* Static Top Section */}
        <View
          style={[
            styles.topSection,
            {
              backgroundColor: colors.primary,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            },
          ]}
        >
       
          <Image source={images.logo} style={styles.logo} />
          <Text
            style={[
              styles.title,
              typography.body,
              { color: colors.background },
            ]}
          >
            {translations.chatCorner}
          </Text>
        </View>

        {/* Snackbar for feedback messages */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={snackbarStyle}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  topSection: {
    height: TOP_SECTION_HEIGHT,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 36,
  },
  backIcon: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  logo: {
    width: 86,
    height: 86,
    resizeMode: "contain",
  },
  title: { marginTop: 10 },
  headingContainer: { marginTop: 6, alignItems: "center", marginBottom: 8 },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: "#ccc",
  },
  activeButton: { backgroundColor: "#007BFF" },
  toggleButtonText: { color: "#fff", fontWeight: "bold" },
  formContainer: { paddingHorizontal: 20 },
  input: { marginBottom: 10, height: 50 },
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    overflow: "hidden",
  },
  picker: { height: 50 },
  pickerLabel: { padding: 8, backgroundColor: "#f0f0f0" },
  uploadContainer: { alignItems: "center", marginVertical: 6 },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    width: "100%",
    borderStyle: "dotted",
    padding: 10,
    borderRadius: 5,
  },
  uploadButtonText: { fontSize: 16 },
  fileName: { marginTop: 5, textAlign: "center" },
});

export default SignUp;
