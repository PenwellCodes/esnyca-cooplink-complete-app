import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';

const LegalCompliance = () => {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>Legal Compliance</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Affiliation to Apex Body
          </Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Cooperatives should be affiliated with an apex body, which ensures representation, 
            coordination, and advocacy within the sector.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Financial Statements
          </Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Regular audited financial statements ensure transparency and accountability.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            User Privacy & Data Protection
          </Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Implementing robust security measures to protect cooperative data and 
            maintaining confidentiality of member information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Grievance Redressal
          </Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            Established procedures for handling member complaints and disputes.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default LegalCompliance;
