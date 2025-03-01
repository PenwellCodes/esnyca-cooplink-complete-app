import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Share,
} from "react-native";
import {
  Text,
  List,
  Divider,
  Switch,
  Button,
  useTheme,
} from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { languages } from "../../utils/translate";
import { useCustomTheme } from "../../context/appstate/CustomThemeProvider";

const SettingsScreen = () => {
  const { toggleTheme, isDarkTheme } = useCustomTheme();
  const { colors } = useTheme();

  const { currentLanguage, changeLanguage, t } = useLanguage();
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
  const router = useRouter();

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
});

export default SettingsScreen;
