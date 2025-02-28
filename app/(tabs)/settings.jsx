import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity, Linking, Share } from "react-native";
import { Text, List, Divider, Switch, Button, useTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

const SettingsScreen = () => {
  const { colors, dark, toggleTheme } = useTheme();
  const [faqVisible, setFaqVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const router = useRouter();

  const handleUpdateProfile = () => {
    router.push("/(screens)/profile");
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL('https://esnyca.pages.dev');
    } catch (error) {
      console.error('Error opening privacy policy:', error);
    }
  };

  const handleInviteFriends = async () => {
    try {
      const message = "Check out this amazing app: ESNICA - Connect with cooperatives!";
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      try {
        await Share.share({ message });
      } catch (shareError) {
        console.error('Error sharing:', shareError);
      }
    }
  };

  const handleLanguageSelect = (language) => {
    console.log(`Language selected: ${language}`);
    setLanguageVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar backgroundColor={colors.primary} style={dark ? "light" : "dark"} />
      <ScrollView>
        <Text style={[styles.appName, { color: colors.tertiary }]}>Settings</Text>
        
        <List.Section>
          <List.Item title="Profile" left={(props) => <List.Icon {...props} icon="account" />} onPress={handleUpdateProfile} right={(props) => <List.Icon {...props} icon="chevron-right" />} />
          <Divider />

          <List.Item title="Privacy" left={(props) => <List.Icon {...props} icon="lock" />} onPress={handlePrivacyPolicy} right={(props) => <List.Icon {...props} icon="chevron-right" />} />
          <Divider />

          <List.Item title="Dark Mode" left={(props) => <List.Icon {...props} icon="brightness-6" />} right={() => <Switch value={dark} onValueChange={toggleTheme} />} />
          <Divider />

          <List.Item title="Language" left={(props) => <List.Icon {...props} icon="translate" />} onPress={() => setLanguageVisible(true)} right={(props) => <List.Icon {...props} icon="chevron-right" />} />
          <Divider />

          <List.Item title="Invite Friends" left={(props) => <List.Icon {...props} icon="account-group" />} onPress={handleInviteFriends} right={(props) => <List.Icon {...props} icon="share" />} />
        </List.Section>
      </ScrollView>

      <Modal visible={languageVisible} animationType="slide" transparent={true} onRequestClose={() => setLanguageVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <Button onPress={() => handleLanguageSelect("Siswati")}>Siswati</Button>
            <Button onPress={() => handleLanguageSelect("German")}>German</Button>
            <Button onPress={() => handleLanguageSelect("English")}>English</Button>
            <Button mode="contained" onPress={() => setLanguageVisible(false)} style={styles.closeButton}>Close</Button>
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
