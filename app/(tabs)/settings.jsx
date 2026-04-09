import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity, Linking, Share } from "react-native";
import { Text, List, Divider, Switch, Button, useTheme, TextInput, Dialog, Portal } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useLanguage } from '../../context/appstate/LanguageContext';
import { languages } from '../../utils/translate';
import { useAuth } from '../../context/appstate/AuthContext';
import { useCustomTheme } from "../../context/appstate/CustomThemeProvider";

const SettingsScreen = () => {
  const { toggleTheme, isDarkTheme } = useCustomTheme();
  const { colors } = useTheme();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { currentUser, logout, deleteAccount } = useAuth();
  const router = useRouter();

  const [translations, setTranslations] = useState({
    settings: "Settings",
    profile: "Profile",
    privacy: "Privacy",
    darkMode: "Dark Mode",
    language: "Language",
    inviteFriends: "Invite Friends",
    selectLanguage: "Select Language",
    close: "Close",
    signOut: "Sign Out",
    deleteAccount: "Delete Account",
    confirmSignOutTitle: "Confirm Sign Out",
    confirmSignOutBody: "Are you sure you want to sign out?",
    cancel: "Cancel",
    signOutConfirm: "Sign Out",
    confirmDeleteTitle: "Delete Account",
    confirmDeleteBody: "This action cannot be undone. Please enter your credentials to confirm.",
    email: "Email",
    password: "Password",
    confirmDelete: "Confirm Delete",
    deleteDialogCancel: "Cancel",
    inviteMessage: "Check out this amazing app: ESNICA - Connect with cooperatives!",
    pleaseSignInFirst: "Please sign in first",
    userDoesNotExist: "User does not exist",
    wrongPasswordOrEmail: "Wrong password or email",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        settings: await t("Settings"),
        profile: await t("Profile"),
        privacy: await t("Privacy"),
        darkMode: await t("Dark Mode"),
        language: await t("Language"),
        inviteFriends: await t("Invite Friends"),
        selectLanguage: await t("Select Language"),
        close: await t("Close"),
        signOut: await t("Sign Out"),
        deleteAccount: await t("Delete Account"),
        confirmSignOutTitle: await t("Confirm Sign Out"),
        confirmSignOutBody: await t("Are you sure you want to sign out?"),
        cancel: await t("Cancel"),
        signOutConfirm: await t("Sign Out"),
        confirmDeleteTitle: await t("Delete Account"),
        confirmDeleteBody: await t(
          "This action cannot be undone. Please enter your credentials to confirm."
        ),
        email: await t("Email"),
        password: await t("Password"),
        confirmDelete: await t("Confirm Delete"),
        deleteDialogCancel: await t("Cancel"),
        inviteMessage: await t(
          "Check out this amazing app: ESNICA - Connect with cooperatives!"
        ),
        pleaseSignInFirst: await t("Please sign in first"),
        userDoesNotExist: await t("User does not exist"),
        wrongPasswordOrEmail: await t("Wrong password or email"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  const [faqVisible, setFaqVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);

  const handleUpdateProfile = () => {
    if (!currentUser) {
      router.push("/(auth)/sign-in");
      return;
    }
    router.push("/(screens)/profile");
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL("https://youthcorner.pages.dev");
    } catch (error) {
      console.error("Error opening privacy policy:", error);
    }
  };

  const handleInviteFriends = async () => {
    try {
      const message = translations.inviteMessage;
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
      await logout();
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 0);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError('');
    try {
      // If no user is logged in, show error
      if (!currentUser) {
        setError(translations.pleaseSignInFirst);
        setLoading(false);
        return;
      }

      const result = await deleteAccount(email, password);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete account");
      }

      // Use setTimeout for navigation
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 0);
    } catch (error) {
      if (error.message.toLowerCase().includes("not found")) {
        setError(translations.userDoesNotExist);
      } else if (error.message.toLowerCase().includes("invalid")) {
        setError(translations.wrongPasswordOrEmail);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        style={isDarkTheme ? "light" : "dark"}
      />
      <ScrollView>
        <Text style={[styles.appName, { color: colors.tertiary }]}>
          {translations.settings}
        </Text>

        <List.Section>
          {/* Modify auth-dependent items to check for currentUser */}
          <List.Item
            title={translations.profile}
            left={(props) => <List.Icon {...props} icon="account" />}
            onPress={handleUpdateProfile}
          />
          <Divider />

          {/* These items don't need auth */}
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

          {/* Always show sign out and delete account */}
          <List.Item 
            title={translations.signOut}
            left={(props) => <List.Icon {...props} icon="logout" color="orange" />} 
            onPress={() => {
              if (!currentUser) {
                // If not logged in, redirect to sign in
                setTimeout(() => {
                  router.push('/(auth)/sign-in');
                }, 0);
                return;
              }
              setSignOutDialogVisible(true);
            }}
          />
          <Divider />

          <List.Item 
            title={translations.deleteAccount}
            left={(props) => <List.Icon {...props} icon="delete" color="red" />} 
            onPress={() => {
              if (!currentUser) {
                // If not logged in, redirect to sign in
                setTimeout(() => {
                  router.push('/(auth)/sign-in');
                }, 0);
                return;
              }
              setDeleteModalVisible(true);
            }}
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
            <Text style={[styles.modalTitle, { color: colors.error }]}>
              {translations.confirmDeleteTitle}
            </Text>
            <Text style={{ marginBottom: 20, color: colors.text }}>
              {translations.confirmDeleteBody}
            </Text>

            <TextInput
              label={translations.email}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label={translations.password}
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
              {translations.confirmDelete}
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
              {translations.deleteDialogCancel}
            </Button>
          </View>
        </View>
      </Modal>

      <Portal>
        <Dialog visible={signOutDialogVisible} onDismiss={() => setSignOutDialogVisible(false)}>
          <Dialog.Title>{translations.confirmSignOutTitle}</Dialog.Title>
          <Dialog.Content>
            <Text>{translations.confirmSignOutBody}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSignOutDialogVisible(false)}>
              {translations.cancel}
            </Button>
            <Button onPress={() => {
              setSignOutDialogVisible(false);
              handleSignOut();
            }}>{translations.signOutConfirm}</Button>
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