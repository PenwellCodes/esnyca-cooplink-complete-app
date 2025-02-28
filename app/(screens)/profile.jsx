import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { useAuth } from "../../context/appstate/AuthContext";
import { useTheme, Snackbar } from "react-native-paper";

const Profile = () => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  const navigation = useNavigation();
  const db = getFirestore();
  const storage = getStorage();
  const auth = getAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;

      setIsLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", auth.currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const data = userDoc.data();
          setUserData({ id: userDoc.id, ...data });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        console.log("Image URI:", uri);
        setNewPhotoUri(uri);
      } else {
        console.log("Image picking canceled or failed");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Error",
        "There was an issue picking the image. Please try again.",
      );
    }
  };

  const uploadProfilePhoto = async () => {
    if (!newPhotoUri) return null;
    try {
      const response = await fetch(newPhotoUri);
      const blob = await response.blob();

      // Use displayName if available, otherwise use name
      const identifier = userData?.displayName || userData?.name || "profile";
      const fileName = `${identifier}_${Date.now()}.jpg`;
      const photoRef = ref(storage, `profilePhotos/${fileName}`);

      await uploadBytes(photoRef, blob);
      return await getDownloadURL(photoRef);
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert("Error", "Failed to upload profile photo");
      return null;
    }
  };

  const updateProfile = async () => {
    if (!userData) return;
    setIsLoading(true);
    try {
      const updatedFields = {};

      // For cooperative users
      if (userData.displayName)
        updatedFields.displayName = userData.displayName;
      // For individual users
      if (userData.name) updatedFields.name = userData.name;

      if (userData.phoneNumber)
        updatedFields.phoneNumber = userData.phoneNumber;
      // Add the description/content field update
      if (userData.content) updatedFields.content = userData.content;

      // Removed location update since the map has been removed
      // if (userData.location) updatedFields.location = userData.location;

      if (newPhotoUri) {
        const photoUrl = await uploadProfilePhoto();
        if (photoUrl) {
          updatedFields.photoUrl = photoUrl;
        }
      }

      const userDocRef = doc(db, "users", userData.id);
      await updateDoc(userDocRef, updatedFields);

      if (currentUser?.role === "cooperative") {
        try {
          const registrationQuery = query(
            collection(db, "registration"),
            where("email", "==", userData.email),
          );
          const registrationDocs = await getDocs(registrationQuery);

          if (!registrationDocs.empty) {
            const registrationDoc = registrationDocs.docs[0];
            const registrationFields = {
              ...updatedFields,
              status: "approved",
            };

            if (userData.region) {
              registrationFields.region = userData.region;
            }

            await updateDoc(
              doc(db, "registration", registrationDoc.id),
              registrationFields,
            );
            console.log("Updated cooperative profile in both collections");
          }
        } catch (regError) {
          console.error("Error updating registration:", regError);
        }
      }

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        "Failed to update profile. Please check your input data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#191970" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.primary }]}>
          Update Profile
        </Text>

        <TouchableOpacity onPress={pickImage}>
          <Image
            source={
              newPhotoUri
                ? { uri: newPhotoUri }
                : userData.photoUrl
                  ? { uri: userData.photoUrl }
                  : require("../../assets/images/default_cooperative.png")
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>
        <Text style={[styles.photoText, { color: colors.primary }]}>
          Tap to change profile photo
        </Text>

        {currentUser?.role === "individual" ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                Name
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter your name"
                value={userData?.name || ""}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, name: text }))
                }
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                Company Name
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter cooperative name"
                value={userData?.displayName || ""}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, displayName: text }))
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                Phone Number
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter phone number"
                value={userData?.phoneNumber || ""}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, phoneNumber: text }))
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                Description
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter business description"
                value={userData?.content || ""}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, content: text }))
                }
              />
            </View>
            {/* Removed the map and location selection */}
          </>
        )}

        <TouchableOpacity
          style={[
            styles.updateButton,
            { backgroundColor: colors.primary, marginTop: 20 },
          ]}
          onPress={updateProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  photoText: {
    marginBottom: 20,
  },
  updateButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  updateButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    paddingLeft: 2,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
});

export default Profile;
