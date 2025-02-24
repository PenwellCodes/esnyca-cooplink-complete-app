import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const LocationsScreen = ({ formData, setFormData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [userLocations, setUserLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const mapRef = useRef(null);

  // Fetch current location or use formData.location
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoading(false);
          return;
        }

        if (formData.location.latitude && formData.location.longitude) {
          // Use location from formData if available
        } else {
          let location = await Location.getCurrentPositionAsync({});
          setFormData({
            ...formData,
            location: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch user locations
  useEffect(() => {
    const fetchUserLocations = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const locations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data().location,
          title: doc.data().companyName || "Unknown Company",
          description: doc.data().content || "No description",
          photoUrl: doc.data().photoUrl,
        })).filter(loc => loc.latitude && loc.longitude);

        setUserLocations(locations);
        setSearchResults(locations);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocations();
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search location"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        showsUserLocation
        initialRegion={{
          latitude: formData.location.latitude || -26.5225,
          longitude: formData.location.longitude || 31.4659,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setFormData({ ...formData, location: { latitude, longitude } });
        }}
      >
        {userLocations.map(location => (
          <Marker
            key={location.id}
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.title}
          />
        ))}
        {formData.location.latitude && (
          <Marker
            coordinate={formData.location}
            title="Selected Location"
            pinColor="blue"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchInput: {
    padding: 12,
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  map: { width: '100%', height: height * 0.6 },
  loadingIndicator: { marginTop: 10 },
});

export default LocationsScreen;
