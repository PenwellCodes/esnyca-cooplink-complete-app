import React from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, StyleSheet, useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const ServiceScreen = () => {
  const navigation = useNavigation();
  const darkMode = useColorScheme() === 'dark'; // Detect dark mode

  return (
    <LinearGradient
      colors={darkMode ? ['#222', '#111'] : ['#F5F5F5', '#FFF']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {[
          { title: 'LEGAL COMPLIANCE', screen: 'LegalCompliance' },
          { title: 'FINANCIAL SERVICES', screen: 'FinancialServices' },
          { title: 'TRAINING AND DEVELOPMENT', screen: 'TrainingAndDevelopment' },
          { title: 'MARKETING AND PROMOTION', screen: 'MarketingAndPromotion' },
          { title: 'RESEARCH AND INSIGHTS', screen: 'ResearchAndInsights' },
        ].map(({ title, screen }) => (
          <TouchableOpacity key={screen} style={styles.button} onPress={() => navigation.navigate(screen)}>
            <LinearGradient
              colors={darkMode ? ['#444', '#333'] : ['#00AAFF', '#0088DD']}
              style={styles.gradient}
            >
              <Text style={[styles.buttonText, darkMode && styles.darkText]}>{title}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  button: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  darkText: {
    color: '#EEE', // Lighter text for dark mode
  },
});

export default ServiceScreen;
