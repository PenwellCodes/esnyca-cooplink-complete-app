import React, { useContext, useState } from 'react';
import {
  View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';

const AboutScreen = () => {
  const navigation = useNavigation();
  const { darkMode } = useContext(ThemeContext);
  
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: {
        backgroundColor: darkMode ? '#1C1C1C' : '#00AAFF',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTitleStyle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
      },
      headerTintColor: '#fff',
      headerTitle: 'About',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, darkMode]);

  const styles = getStyles(darkMode);

  return (
    <LinearGradient
      colors={darkMode ? ['#1C1C1C', '#333'] : ['#F5F5F5', '#F5F5F5']}
      style={styles.container}
    >
  

      <ScrollView style={styles.scrollView}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('OurStory')}
        >
          <LinearGradient
            colors={darkMode ? ['#555', '#444'] : ['#00AAFF', '#00AAFF']}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Our Story</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MissionsAndVisions')}
        >
          <LinearGradient
            colors={darkMode ? ['#555', '#444'] : ['#00AAFF', '#00AAFF']}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Missions and Visions</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MeetTheTeam')}
        >
          <LinearGradient
            colors={darkMode ? ['#555', '#444'] : ['#00AAFF', '#00AAFF']}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Meet the Team</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const getStyles = (darkMode) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkMode ? '#333' : '#F5F5F5',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: darkMode ? '#FFF' : '#000',
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    color: darkMode ? '#FFF' : '#191970',
  },
  scrollView: {
    marginTop: 100,
    flex: 1,
  },
  button: {
    height: 65,
    width: '90%',
    borderRadius: 20,
    marginVertical: 10,
    overflow: 'hidden',
    borderWidth: 2,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    width: "95%",
    alignSelf: "center",
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 18,
  },
  buttonText: {
    color: darkMode ? '#FFF' : '#191970',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AboutScreen;
