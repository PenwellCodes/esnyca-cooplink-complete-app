import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useTheme, Button } from 'react-native-paper';

const PrivacyPolicy = () => {
  const { colors } = useTheme();

  const openPrivacyPolicy = () => {
    Linking.openURL('https://esnyaca.pages.dev');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
      <Button mode="contained" onPress={openPrivacyPolicy}>
        View Privacy Policy
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default PrivacyPolicy;
