import React, { useState, useCallback, useEffect } from "react";
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity, Linking, Share } from "react-native";
import { Text, List, Divider, Switch, Button, useTheme, TextInput, Dialog, Portal } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useLanguage } from '../../context/appstate/LanguageContext';
import { languages } from '../../utils/translate';
import { useAuth } from '../../context/appstate/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { useCustomTheme } from "../../context/appstate/CustomThemeProvider";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const SettingsScreen = () => {
  const { toggleTheme, isDarkTheme } = useCustomTheme();
  const { colors } = useTheme();

  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { currentUser } = useAuth();
  const [translations, setTranslations] = useState({
    settings: "Settings",
    profile: "Profile",
    privacy: "Privacy",
    darkMode: "Dark Mode",
    language: "Language",
    inviteFriends: "Invite Friends",
    selectLanguage: "Select Language",
    close: "Close",
  });

  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/sign-in');
    }
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  // Load translations when language changes
  // Load translations when language changes
  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      const translated = {};
      for (const [key, value] of Object.entries(translations)) {
        translated[key] = await t(value);
      }
      setTranslations(translated);
    };

    loadTranslations();
  }, [currentLanguage]);

  const [faqVisible, setFaqVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);

  const handleUpdateProfile = () => {
    router.push("/(screens)/profile");
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL("https://esnyca.pages.dev");
    } catch (error) {
      console.error("Error opening privacy policy:", error);
    }
  };

  const handleInviteFriends = async () => {
    try {
      const message =
        "Check out this amazing app: ESNICA - Connect with cooperatives!";
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      try {
        await Share.share({ message });
      } catch (shareError) {
        console.error("Error sharing:", shareError);
      }
    }
  };

  const handleLanguageSelect = useCallback(
    async (langCode) => {
      await changeLanguage(langCode);
      setLanguageVisible(false);
    },
    [changeLanguage],
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
 

const handleDeleteAccount = async () => {
  setLoading(true);
  setError('');
  try {
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);

    const uid = auth.currentUser.uid; // Auth UID

    // 🔹 Find the correct Firestore document based on UID
    const usersCollection = collection(db, "users");
    const userQuery = query(usersCollection, where("uid", "==", uid));
    const querySnapshot = await getDocs(userQuery);

    if (!querySnapshot.empty) {
      querySnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref); // ✅ Correctly deletes Firestore user
      });
    } else {
      console.log("No user document found for UID:", uid);
    }

    // 🔹 Delete user-related data (stories, posts, etc.)
    const collectionsToDelete = ["stories", "posts", "comments"];
    for (const collectionName of collectionsToDelete) {
      const querySnapshot = await getDocs(query(collection(db, collectionName), where("userId", "==", uid)));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    // 🔹 Delete user from Firebase Authentication
    await deleteUser(auth.currentUser);

    // 🔹 Logout user to prevent issues
    await signOut(auth);

    router.replace('/sign-in');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      setError('User does not exist');
    } else if (error.code === 'auth/wrong-password') {
      setError('Wrong password or email');
    } else {
      setError(error.message);
    }
  } finally {
    setLoading(false);
  }
};

  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.primary} style={"light"} />
      <ScrollView>
        <Text style={[styles.appName, { color: colors.tertiary }]}>
          {translations.settings}
        </Text>

        <List.Section>
          <List.Item
            title={translations.profile}
            left={(props) => <List.Icon {...props} icon="account" />}
            onPress={handleUpdateProfile}
          />
          <Divider />

          <List.Item
            title={translations.privacy}
            left={(props) => <List.Icon {...props} icon="lock" />}
            onPress={handlePrivacyPolicy}
          />
          <Divider />

          <List.Item
            title={translations.darkMode}
            left={(props) => <List.Icon {...props} icon="brightness-6" />}
            right={() => (
              <Switch value={isDarkTheme} onValueChange={toggleTheme} />
            )}
          />
          <Divider />

          <List.Item
            title={translations.language}
            left={(props) => <List.Icon {...props} icon="translate" />}
            onPress={() => setLanguageVisible(true)}
          />
          <Divider />

          <List.Item
            title={translations.inviteFriends}
            left={(props) => <List.Icon {...props} icon="account-group" />}
            onPress={handleInviteFriends}
          />
          <Divider />

          <List.Item 
            title="Sign Out"
            left={(props) => <List.Icon {...props} icon="logout" color="orange" />} 
            onPress={() => setSignOutDialogVisible(true)}
          />
          <Divider />

          <List.Item 
            title="Delete Account"
            left={(props) => <List.Icon {...props} icon="delete" color="red" />} 
            onPress={() => setDeleteModalVisible(true)}
          />
        </List.Section>
      </ScrollView>

      <Modal visible={languageVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{translations.selectLanguage}</Text>
            {Object.entries(languages).map(([code, name]) => (
              <Button
                key={code}
                onPress={() => handleLanguageSelect(code)}
                mode={currentLanguage === code ? "contained" : "outlined"}
              >
                {name}
              </Button>
            ))}
            <Button
              mode="contained"
              onPress={() => setLanguageVisible(false)}
              style={styles.closeButton}
            >
              {translations.close}
            </Button>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Account</Text>
            <Text style={{ marginBottom: 20, color: colors.text }}>
              This action cannot be undone. Please enter your credentials to confirm. 
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button 
              mode="contained"
              onPress={handleDeleteAccount}
              textColor={colors.secondary}
              loading={loading}
              disabled={loading || !email || !password}
              style={[styles.deleteButton, { backgroundColor: colors.success }]}
            >
              Confirm Delete
            </Button>

            <Button 
              mode="outlined"
              onPress={() => {
                setDeleteModalVisible(false);
                setEmail('');
                setPassword('');
                setError('');
              }}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      <Portal>
        <Dialog visible={signOutDialogVisible} onDismiss={() => setSignOutDialogVisible(false)}>
          <Dialog.Title>Confirm Sign Out</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to sign out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSignOutDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => {
              setSignOutDialogVisible(false);
              handleSignOut();
            }}>Sign Out</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
  },
  appName: {
    fontSize: 24,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default SettingsScreen;
