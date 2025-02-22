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
import { auth, db } from "../../firebase/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { Redirect } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";

const TOP_SECTION_HEIGHT = 250;

const SignUp = () => {
  const { colors } = useTheme();

  // Registration role: individual or cooperative
  const [role, setRole] = useState("individual");
  const [redirect, setRedirect] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    registrationNumber: "", // For cooperatives
    physicalAddress: "",
    region: "", // For cooperatives
  });

  // New state for profile picture URI
  const [profilePic, setProfilePic] = useState(null);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarStyle, setSnackbarStyle] = useState({});

  // Loading state for ActivityIndicator
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: field === "email" ? value.trim() : value,
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access media library is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };


  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      console.log("User registered with uid:", userCredential.user.uid);

      // Common user data
      const userData = {
        uid: userCredential.user.uid,
        role: role,
        displayName: formData.displayName,
        email: formData.email,
        profilePic: profilePic, // For production, upload image to storage and save URL
      };

      if (role === "cooperative") {
        Object.assign(userData, {
          registrationNumber: formData.registrationNumber,
          physicalAddress: formData.physicalAddress,
          region: formData.region,
        });
      }

      await addDoc(collection(db, "users"), userData);

      setSnackbarMessage(
        role === "cooperative"
          ? "Cooperative successfully registered"
          : "Individual successfully registered",
      );
      setSnackbarStyle({ backgroundColor: "green" });
      setSnackbarVisible(true);

      setTimeout(() => {
        setRedirect(true);
      }, 1500);
    } catch (error) {
      console.error("Error during sign up:", error);
      setSnackbarMessage(error.message);
      setSnackbarStyle({ backgroundColor: "red" });
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (redirect) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Helper: extract file name from URI
  const getFileName = (uri) => uri.split("/").pop();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: TOP_SECTION_HEIGHT },
          ]}
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
              Register as
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
                Individual
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
                Cooperative
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {role === "individual" ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Name"
                  value={formData.displayName}
                  onChangeText={(value) =>
                    handleInputChange("displayName", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Password"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label="Cooperative Name"
                  value={formData.displayName}
                  onChangeText={(value) =>
                    handleInputChange("displayName", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Registration Number"
                  value={formData.registrationNumber}
                  onChangeText={(value) =>
                    handleInputChange("registrationNumber", value)
                  }
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Physical Address"
                  value={formData.physicalAddress}
                  onChangeText={(value) =>
                    handleInputChange("physicalAddress", value)
                  }
                  style={styles.input}
                />
                <View style={styles.pickerContainer}>
                  <Text style={[styles.pickerLabel, { color: colors.text }]}>
                    Region
                  </Text>
                  <Picker
                    selectedValue={formData.region}
                    style={[styles.picker, { flex: 1 }]}
                    onValueChange={(value) =>
                      handleInputChange("region", value)
                    }
                  >
                    <Picker.Item label="Select Region" value="" />
                    <Picker.Item label="Hhohho" value="Hhohho" />
                    <Picker.Item label="Manzini" value="Manzini" />
                    <Picker.Item label="Shiselweni" value="Shiselweni" />
                    <Picker.Item label="Lubombo" value="Lubombo" />
                  </Picker>
                </View>
                <TextInput
                  mode="outlined"
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Password"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  style={styles.input}
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
                  Upload Profile
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
              title={
                loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  `Register as ${
                    role === "individual" ? "Individual" : "Cooperative"
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
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.background}
            style={styles.backIcon}
            onPress={() => {
              // Navigation logic if needed
            }}
          />
          <Ionicons
          name="arrow-back"
          size={24}
          color={colors.background}
          style={styles.backIcon}
        />
          <Image source={images.logo} style={styles.logo} />
          <Text
            style={[
              styles.title,
              typography.body,
              { color: colors.background },
            ]}
          >
            CHAT CORNER
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
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  topSection: {
    height: TOP_SECTION_HEIGHT,
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
  },
  title: { marginTop: 10 },
  headingContainer: { marginTop: 10, alignItems: "center", marginBottom: 10 },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
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
  input: { marginBottom: 15 },
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    overflow: "hidden",
  },
  picker: { height: 50 },
  pickerLabel: {
    padding: 8,
    backgroundColor: "#f0f0f0",
  },
  uploadContainer: { alignItems: "center", marginVertical: 10 },
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
