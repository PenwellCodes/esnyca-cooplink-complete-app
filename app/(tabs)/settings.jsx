import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Text, List, Divider, Switch, Button } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { typography } from "../../constants";
import { useTheme } from "react-native-paper";

const SettingsScreen = () => {
  const { colors } = useTheme();
  const [darkMode, setDarkMode] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);

  const faqData = [
    {
      question: "How do I reset my password?",
      answer: "Go to settings, select security, and click reset password.",
    },
    {
      question: "How can I contact support?",
      answer: "You can reach us via email at support@example.com.",
    },
    {
      question: "Can I change my username?",
      answer: "Currently, username changes are not supported.",
    },
    {
      question: "How do I enable notifications?",
      answer:
        "Go to settings, select notifications, and enable push notifications.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use end-to-end encryption to protect your data.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.primary} style="light" />
      <ScrollView>
        <Text
          style={[
            styles.appName,
            typography.robotoBold,
            typography.subtitle,
            { color: colors.tertiary },
          ]}
        >
          Settings
        </Text>

        <List.Section>
          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Profile
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => (
              <Text style={styles.disabledText}>Update Profile</Text>
            )}
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Change Language (English)
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="translate" />}
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Privacy
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="lock" />}
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Toggle Dark Mode
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="brightness-6" />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={() => setDarkMode(!darkMode)}
              />
            )}
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Help
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="help-circle" />}
          />
          <Divider />

          <List.Item
            title={
              <Text style={styles.disabledText}>
                Frequently Asked Questions
              </Text>
            }
            onPress={() => setFaqVisible(true)}
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.link },
                ]}
              >
                View on YouTube
              </Text>
            }
          />
          <Divider />

          <List.Item
            title={
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                Invite Friends
              </Text>
            }
            left={(props) => <List.Icon {...props} icon="account-group" />}
          />
        </List.Section>
      </ScrollView>

      {/* FAQ Modal */}
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
