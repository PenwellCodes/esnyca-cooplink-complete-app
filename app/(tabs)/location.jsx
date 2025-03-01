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
  Alert,
  Image,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/FontAwesome';
import haversine from 'haversine';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LocationsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [radius, setRadius] = useState(1000);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [userLocations, setUserLocations] = useState([]);

  const mapRef = useRef(null);

  // Get current location
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Permission to access location was denied.');
          setLoading(false);
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        setErrorMessage('Error fetching current location.');
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
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const locations = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data.location,
              title: data.displayName || 'Unknown Company',
              description: data.content || 'No description available',
              photoUrl: data.profilePic,
              companyAddress: data.companyAddress,
            };
          })
          .filter(location => location.latitude && location.longitude);

        setUserLocations(locations);
        setSearchResults(locations);
      } catch (error) {
        console.error('Error fetching user locations:', error);
        setErrorMessage('Error loading user locations');
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocations();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(userLocations);
      return;
    }
    const filteredLocations = userLocations.filter((location) =>
      location.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filteredLocations);
  };

  const calculateDistance = (lat, lng) => {
    if (!currentLocation) return null;
    const distance = haversine(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: lat, longitude: lng },
      { unit: 'km' }
    );
    return distance.toFixed(2);
  };

  const recenterMap = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const renderMarker = (location) => (
    <Marker
      key={location.id}
      coordinate={{ 
        latitude: location.latitude, 
        longitude: location.longitude 
      }}
      title={location.title}
      description={location.description}
    >
      {location.photoUrl ? (
        <View style={styles.customMarker}>
          <Image 
            source={{ uri: location.photoUrl }} 
            style={styles.markerImage}
          />
          <Ionicons 
            name="location-sharp" 
            size={40} 
            color="#191970" 
            style={styles.markerIcon}
          />
        </View>
      ) : (
        <Ionicons name="location-sharp" size={40} color="#191970" />
      )}
    </Marker>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for a location"
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
        onSubmitEditing={handleSearch}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}

      <View style={styles.controlContainer}>
        <Text style={styles.controlLabel}>Radius: {radius / 1000} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={1000}
          maximumValue={10000}
          step={500}
          value={radius}
          onValueChange={(value) => setRadius(value)}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setSearchResults(userLocations)}
        >
          <Icon name="times-circle" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
        >
          <Icon name="map" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Switch View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={recenterMap}>
          <Icon name="location-arrow" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Re-center</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() => setSelectedLocation(item)}
          >
            <Text style={styles.resultText}>
              {item.title} - {calculateDistance(item.latitude, item.longitude)} km
            </Text>
          </TouchableOpacity>
        )}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={true}
        showsCompass={true}
        zoomControlEnabled={true}
        initialRegion={{
          latitude: currentLocation ? currentLocation.latitude : -26.5225,
          longitude: currentLocation ? currentLocation.longitude : 31.4659,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        customMapStyle={[
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ]}
      >
        {searchResults.map(renderMarker)}
        {userLocations.map(renderMarker)}
        {currentLocation && (
          <Circle
            center={currentLocation}
            radius={radius}
            strokeColor="rgba(0, 122, 255, 0.5)"
            fillColor="rgba(0, 122, 255, 0.2)"
          />
        )}
      </MapView>

      {selectedLocation && (
        <Modal
          animationType="slide"
          transparent
          visible
          onRequestClose={() => setSelectedLocation(null)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedLocation.title}</Text>
            <Text style={styles.modalDescription}>
              {selectedLocation.description}
            </Text>
            {selectedLocation.companyAddress && (
              <Text style={styles.modalAddress}>
                Address: {selectedLocation.companyAddress}
              </Text>
            )}
            <Text style={styles.modalDistance}>
              Distance: {calculateDistance(selectedLocation.latitude, selectedLocation.longitude)} km
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedLocation(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 20,
  },
  searchInput: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  },
  controlContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    borderRadius: 10,
    elevation: 3,
  },
  controlLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
  },
  map: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 10,
    marginVertical: 10,
    zIndex: 1,
  },
  resultItem: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFF',
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 10,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#191970',
  },
  markerIcon: {
    position: 'absolute',
    bottom: -20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalAddress: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default LocationsScreen;
