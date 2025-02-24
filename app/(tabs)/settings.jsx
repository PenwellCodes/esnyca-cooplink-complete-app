import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity, Linking, Share } from "react-native";
import { Text, List, Divider, Switch, Button, useTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { typography } from "../../constants";
import { useRouter } from "expo-router"; // Change this import

const SettingsScreen = () => {
  const { colors, dark, toggleTheme } = useTheme();
  const [faqVisible, setFaqVisible] = useState(false);
  const router = useRouter(); // Use router instead of navigation

  const handleUpdateProfile = () => {
    router.push("/(screens)/profile"); // Use Expo Router syntax
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
      // Fallback to regular share if WhatsApp isn't installed
      try {
        await Share.share({
          message: message,
        });
      } catch (shareError) {
        console.error('Error sharing:', shareError);
      }
    }
  };

  const faqData = [
    {
      question: "How do I reset my password?",
      answer: "Click on the forget password link and follow the promps that follow.",
    },
    {
      question: "How can I contact support?",
      answer: "You can reach us via email at synca17@gmail.com.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes,you can check this by going to the privacy policy,To see how we handle your data.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.primary} style={dark ? "light" : "dark"} />
      <ScrollView>
        <Text style={[styles.appName, { color: colors.tertiary }]}>
          Settings
        </Text>

        <List.Section>
          <List.Item
            title="Profile"
            left={(props) => <List.Icon {...props} icon="account" />}
            onPress={handleUpdateProfile}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />

          <List.Item
            title="Privacy"
            left={(props) => <List.Icon {...props} icon="lock" />}
            onPress={handlePrivacyPolicy}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />

          <List.Item
            title="Dark Mode"
            left={(props) => <List.Icon {...props} icon="brightness-6" />}
            right={() => (
              <Switch
                value={dark}
                onValueChange={toggleTheme}
              />
            )}
          />
          <Divider />

          <List.Item
            title="Frequently Asked Questions"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            onPress={() => setFaqVisible(true)}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />

          <List.Item
            title="Invite Friends"
            left={(props) => <List.Icon {...props} icon="account-group" />}
            onPress={handleInviteFriends}
            right={(props) => <List.Icon {...props} icon="share" />}
          />
        </List.Section>
      </ScrollView>

      <Modal
        visible={faqVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFaqVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
            <ScrollView>
              {faqData.map((faq, index) => (
                <List.Accordion
                  key={index}
                  title={faq.question}
                  titleStyle={styles.faqQuestion}
                  left={(props) => (
                    <List.Icon {...props} icon="help-circle-outline" />
                  )}
                >
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </List.Accordion>
              ))}
            </ScrollView>
            <Button
              mode="contained"
              onPress={() => setFaqVisible(false)}
              style={styles.closeButton}
            >
              Close
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
  menuText: {
    fontSize: 16,
  },
  disabledText: {
    fontSize: 14,
    color: "gray",
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
  faqQuestion: {
    fontSize: 16,
    fontWeight: "bold",
  },
  faqAnswer: {
    fontSize: 14,
    padding: 10,
  },
  closeButton: {
    marginTop: 10,
  },
});

export default SettingsScreen;
