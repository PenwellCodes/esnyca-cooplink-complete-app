import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  Snackbar,
  TextInput,
  Button,
  Appbar,
  Divider,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import {
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useAuth } from "../../context/appstate/AuthContext";
import { db, auth } from "../../firebase/firebaseConfig";
import { images, typography } from "../../constants";
// Import Firebase Storage functions
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [userData, setUserData] = useState(null);
  const [updateDrawerVisible, setUpdateDrawerVisible] = useState(false);
  const [deleteDrawerVisible, setDeleteDrawerVisible] = useState(false);
  const [formData, setFormData] = useState({});
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState("green");
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Function to upload the selected image to Firebase Storage
  // and return the remote download URL.
  const uploadImageToFirebase = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      // Use a unique filename using the user's uid and current timestamp.
      const filename = `${userData.uid}_${Date.now()}.jpg`;
      const storageRef = ref(getStorage(), `profilePictures/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.log("Error uploading image: ", error);
      throw error;
    }
  };

  // Function to pick an image from the gallery and update the profile picture.
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      // For immediate feedback, update local state with the local URI.
      setFormData({ ...formData, profilePic: newUri });

      try {
        // Upload the image to Firebase Storage and get its download URL.
        const downloadUrl = await uploadImageToFirebase(newUri);
        // Reference the user document in Firestore.
        const userRef = doc(db, "users", userData.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          // Update the profilePic field with the remote download URL.
          await updateDoc(userRef, { profilePic: downloadUrl });
          showSnackbar("Profile picture updated successfully", "green");
          console.log("Profile picture updated with URL: ", downloadUrl);
        } else {
          showSnackbar("User document does not exist", "red");
        }
      } catch (error) {
        console.log("Error updating profile picture:", error);
        showSnackbar("Error uploading image: " + error.message, "red");
      }
    }
  };

  // Subscribe to user data and update loading state.
  useEffect(() => {
    if (currentUser) {
      const q = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid),
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const data = userDoc.data();
          setUserData({
            uid: userDoc.id,
            ...data,
            phoneNumbers: Array.isArray(data.phoneNumbers)
              ? data.phoneNumbers
              : [],
            addresses: Array.isArray(data.addresses) ? data.addresses : [],
          });
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || "",
        email: userData.email || "",
        profilePic: userData.profilePic || "",
        physicalAddress:
          userData.role === "cooperative" ? userData.physicalAddress || "" : "",
        phoneNumbers: userData.phoneNumbers || [],
      });
    }
  }, [userData]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Image source={images.loader} style={styles.loader} />
      </View>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          No user data available.
        </Text>
      </SafeAreaView>
    );
  }

  const handleAddPhoneNumber = () => {
    if (newPhoneNumber.trim()) {
      setFormData({
        ...formData,
        phoneNumbers: [...formData.phoneNumbers, newPhoneNumber.trim()],
      });
      setNewPhoneNumber("");
    }
  };

  const handleRemovePhoneNumber = (index) => {
    const updatedPhoneNumbers = formData.phoneNumbers.filter(
      (_, i) => i !== index,
    );
    setFormData({ ...formData, phoneNumbers: updatedPhoneNumbers });
  };

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      const userRef = doc(db, "users", userData.uid);
      const updateData = {
        displayName: formData.displayName,
        email: formData.email,
        // profilePic is updated separately through the image picker.
        phoneNumbers: formData.phoneNumbers,
      };
      if (userData.role === "cooperative") {
        updateData.physicalAddress = formData.physicalAddress;
      }
      await updateDoc(userRef, updateData);
      setIsUpdating(false);
      setUpdateDrawerVisible(false);
      showSnackbar("Profile updated successfully", "green");
    } catch (error) {
      setIsUpdating(false);
      setUpdateDrawerVisible(false);
      showSnackbar("Error updating profile: " + error.message, "red");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await deleteDoc(doc(db, "users", userData.uid));
      await currentUser.delete();
      showSnackbar("Account deleted successfully", "green");
      setDeleteDrawerVisible(false);
      await signOut(auth);
      navigation.replace("Home");
    } catch (error) {
      setDeleteDrawerVisible(false);
      showSnackbar("Error deleting account: " + error.message, "red");
    }
  };

  const showSnackbar = (message, color) => {
    setSnackbarMessage(message);
    setSnackbarColor(color);
    setSnackbarVisible(true);
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Profile" />
      </Appbar.Header>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView style={styles.content}>
          <View
            style={[styles.profileHeader, { backgroundColor: colors.surface }]}
          >
            {/* Tap the profile image to change it */}
            <Pressable onPress={pickImage}>
              <Image
                source={{
                  uri:
                    formData.profilePic ||
                    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541",
                }}
                style={styles.avatar}
              />
            </Pressable>
            <Text
              style={[styles.editProfileText, { color: colors.primary }]}
              onPress={() => setUpdateDrawerVisible(true)}
            >
              Edit Profile
            </Text>
            <View style={styles.profileContent}>
              <Text style={[styles.name, { color: colors.text }]}>
                {formData.displayName}
              </Text>
              <Divider style={styles.divider} />
              <Text style={[styles.email, { color: colors.text }]}>
                {formData.email}
              </Text>
              <Divider style={styles.divider} />
              {userData.role === "cooperative" && (
                <>
                  <Text style={[styles.info, { color: colors.text }]}>
                    Registration Number: {userData.registrationNumber}
                  </Text>
                  <Divider style={styles.divider} />
                  <Text style={[styles.info, { color: colors.text }]}>
                    Region: {userData.region}
                  </Text>
                  <Divider style={styles.divider} />
                  <Text style={[styles.info, { color: colors.text }]}>
                    Physical Address: {userData.physicalAddress}
                  </Text>
                  <Divider style={styles.divider} />
                </>
              )}
              {userData.phoneNumbers.length > 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Phone Numbers
                  </Text>
                  <Divider style={styles.divider} />
                  {userData.phoneNumbers.map((phone, index) => (
                    <View key={index}>
                      <Text style={[styles.info, { color: colors.text }]}>
                        {phone}
                      </Text>
                      <Divider style={styles.divider} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {userData.addresses.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Addresses
              </Text>
              {userData.addresses.map((address) => (
                <View
                  key={address.id}
                  style={[
                    styles.addressCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.addressHeader}>
                    <View style={styles.addressType}>
                      <Text
                        style={[styles.addressTypeText, { color: colors.text }]}
                      >
                        {address.type}
                      </Text>
                    </View>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.addressText, { color: colors.text }]}>
                    {address.street}, {address.city}, {address.state}{" "}
                    {address.zipCode}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={[styles.logoutButton, { backgroundColor: colors.primary }]}
            onPress={() => signOut(auth)}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>

          <Pressable
            style={[styles.deleteButton, { backgroundColor: "#D32F2F" }]}
            onPress={() => setDeleteDrawerVisible(true)}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Pressable>
        </ScrollView>

        {/* Update Profile Drawer */}
        <Modal
          visible={updateDrawerVisible}
          onRequestClose={() => setUpdateDrawerVisible(false)}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.drawerContainer}>
            <View style={styles.drawerContent}>
              <TextInput
                label="Display Name"
                value={formData.displayName}
                onChangeText={(text) =>
                  setFormData({ ...formData, displayName: text })
                }
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                mode="outlined"
                style={styles.input}
              />
              {userData.role === "cooperative" && (
                <TextInput
                  label="Physical Address"
                  value={formData.physicalAddress}
                  onChangeText={(text) =>
                    setFormData({ ...formData, physicalAddress: text })
                  }
                  mode="outlined"
                  style={styles.input}
                />
              )}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Phone Numbers
              </Text>
              {formData.phoneNumbers &&
                formData.phoneNumbers.map((phone, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginVertical: 5,
                    }}
                  >
                    <Text style={{ flex: 1, color: colors.text }}>{phone}</Text>
                    <Button
                      mode="text"
                      onPress={() => handleRemovePhoneNumber(index)}
                      color={colors.error}
                    >
                      Remove
                    </Button>
                  </View>
                ))}
              <TextInput
                label="Add Phone Number"
                value={newPhoneNumber}
                onChangeText={setNewPhoneNumber}
                mode="outlined"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleAddPhoneNumber}
                style={styles.button}
              >
                Add Phone Number
              </Button>
              <View style={styles.drawerActions}>
                <Button
                  mode="outlined"
                  onPress={() => setUpdateDrawerVisible(false)}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpdateProfile}
                  disabled={isUpdating}
                  loading={isUpdating}
                >
                  {isUpdating ? "Processing..." : "Save"}
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Account Drawer */}
        <Modal
          visible={deleteDrawerVisible}
          onRequestClose={() => setDeleteDrawerVisible(false)}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.drawerContainer}>
            <View style={styles.drawerContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Delete Account
              </Text>
              <Text style={{ color: colors.text, marginBottom: 20 }}>
                Please enter your password to confirm account deletion.
              </Text>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.drawerActions}>
                <Button
                  mode="outlined"
                  onPress={() => setDeleteDrawerVisible(false)}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleDeleteAccount}
                  color="#D32F2F"
                >
                  Delete
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {/* Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: snackbarColor,
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loader: {
    width: 50,
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    padding: 24,
    backgroundColor: "#FFF",
    alignItems: "flex-start",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 8,
  },
  editProfileText: {
    textDecorationLine: "underline",
    marginBottom: 16,
  },
  profileContent: {
    width: "100%",
  },
  name: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
    textAlign: "left",
  },
  email: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    textAlign: "left",
  },
  info: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginVertical: 2,
    textAlign: "left",
  },
  divider: {
    marginVertical: 10,
    backgroundColor: "#C1B8C8",
    height: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 16,
    textAlign: "left",
  },
  section: {
    marginTop: 24,
    padding: 16,
  },
  addressCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressType: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressTypeText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    marginLeft: 8,
    textTransform: "capitalize",
  },
  defaultBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: "#4CAF50",
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  logoutButton: {
    margin: 16,
    marginTop: 32,
    backgroundColor: "#F44336",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  deleteButton: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  drawerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawerContent: {
    backgroundColor: "#FFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  drawerActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginVertical: 10,
  },
});
