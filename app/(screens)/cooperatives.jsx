import React, { useContext } from 'react';
import {
  View, Image, TouchableOpacity, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';



const CooperativesScreen = ({ route }) => {
  const navigation = useNavigation();
  

 

  return (
    <LinearGradient colors={['#f5f5f5', '#f5f5f5']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {searchQuery && (
          <Text style={styles.searchHint}>
            
          </Text>
        )}
        <Text style={styles.heading}>{t('cooperativesByRegion')}</Text>
        
        {/* Hhohho Section */}
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.navigate('Hhohho')}
        >
          <Image source={require('../../assets/images/default_cooperative.png')} style={styles.buttonImage} />
          <Text style={styles.buttonText}>{t('hhohho')}</Text>
        </TouchableOpacity>

        {/* Manzini Section */}
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.navigate('Manzini')}
        >
          <Image source={require('../../assets/images/default_cooperative.png')} style={styles.buttonImage} />
          <Text style={styles.buttonText}>{t('manzini')}</Text>
        </TouchableOpacity>

        {/* Lubombo Section */}
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.navigate('Lubombo')}
        >
          <Image source={require('../../assets/images/default_cooperative.png')} style={styles.buttonImage} />
          <Text style={styles.buttonText}>{t('lubombo')}</Text>
        </TouchableOpacity>

        {/* Shiselweni Section */}
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => navigation.navigate('Shiselweni')}
        >
          <Image source={require('../../assets/images/default_cooperative.png')} style={styles.buttonImage} />
          <Text style={styles.buttonText}>{t('shiselweni')}</Text>
        </TouchableOpacity>

      
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '90%',
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 5,
    borderWidth: 2,
  },
  buttonImage: {
    width: '100%',
    height: 150,
  },
  buttonText: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 22,
    margin: 20,
  },
  searchHint: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
});

export default CooperativesScreen;