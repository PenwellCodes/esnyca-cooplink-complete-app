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
import haversine from 'haversine';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { typography } from '../../constants';

const { width, height } = Dimensions.get('window');

const LocationsScreen = () => {
  const { colors } = useTheme();
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

  // Sample static user locations
  useEffect(() => {
    const staticLocations = [
      {
        id: '1',
        latitude: -26.5225,
        longitude: 31.4659,
        title: 'Sample Location 1',
        description: 'Description for Sample Location 1',
        photoUrl: 'https://via.placeholder.com/150',
        companyAddress: '123 Sample Street',
      },
      {
        id: '2',
        latitude: -26.5325,
        longitude: 31.4759,
        title: 'Sample Location 2',
        description: 'Description for Sample Location 2',
        photoUrl: 'https://via.placeholder.com/150',
        companyAddress: '456 Example Avenue',
      },
    ];

    setUserLocations(staticLocations);
    setSearchResults(staticLocations);
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
        longitude: location.longitude,
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
            color={colors.primary}
            style={styles.markerIcon}
          />
        </View>
      ) : (
        <Ionicons name="location-sharp" size={40} color={colors.primary} />
      )}
    </Marker>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.onSurface }]}
        placeholder="Search for a location"
        placeholderTextColor={colors.onSurface}
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
        onSubmitEditing={handleSearch}
      />
      {errorMessage ? <Text style={[styles.errorText, typography.body, { color: colors.error }]}>{errorMessage}</Text> : null}

      {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />}

      <View style={[styles.controlContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.controlLabel, typography.body, { color: colors.onSurface }]}>Radius: {radius / 1000} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={1000}
          maximumValue={10000}
          step={500}
          value={radius}
          onValueChange={(value) => setRadius(value)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.onSurface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.buttonContainer}>
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={() => setSearchResults(userLocations)}
    >
      <Icon name="times-circle" size={20} color={colors.onPrimary} />
      <Text style={[styles.buttonText, typography.button]}>Reset</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={recenterMap}
    >
      <Icon name="crosshairs" size={20} color={colors.onPrimary} />
      <Text style={[styles.buttonText, typography.button]}>Recenter</Text>
    </TouchableOpacity>
  </View>

  {currentLocation && (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      mapType={mapType}
      zoomEnabled={false}
      scrollEnabled={false}
    >
      <Marker coordinate={currentLocation} title="Your Location">
        <Ionicons name="person-circle" size={40} color={colors.primary} />
      </Marker>

      {searchResults.map(renderMarker)}

      <Circle
        center={currentLocation}
        radius={radius}
        strokeColor={colors.primary}
        fillColor="rgba(0, 122, 255, 0.2)"
      />
    </MapView>
  )}

  <FlatList
    data={searchResults}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <TouchableOpacity style={[styles.locationCard, { backgroundColor: colors.surface }]} onPress={() => setSelectedLocation(item)}>
        <Text style={[styles.locationTitle, typography.subtitle]}>{item.title}</Text>
        <Text style={[styles.locationDescription, typography.body]}>
          {item.companyAddress}
        </Text>
        <Text style={[styles.locationDistance, typography.body]}>
          {calculateDistance(item.latitude, item.longitude)} km away
        </Text>
      </TouchableOpacity>
    )}
  />

  <Modal visible={!!selectedLocation} animationType="slide" transparent>
    <View style={styles.modalContainer}>
      {selectedLocation && (
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Image source={{ uri: selectedLocation.photoUrl }} style={styles.modalImage} />
          <Text style={[styles.modalTitle, typography.title]}>{selectedLocation.title}</Text>
          <Text style={[styles.modalText, typography.body]}>{selectedLocation.description}</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={[styles.closeButtonText, typography.button]}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  </Modal>
</View>
);
};
const styles = StyleSheet.create({ container: 
  { flex: 1, padding: 10 },
   searchInput: { padding: 10,
     borderWidth: 1, borderRadius: 5,
      marginBottom: 10 },

    errorText: { textAlign: 'center', marginBottom: 10 },
     loadingIndicator: { marginTop: 20 }, controlContainer: { padding: 10, borderRadius: 5, marginBottom: 10 }, controlLabel: { textAlign: 'center', marginBottom: 5 }, slider: { width: '100%' }, buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }, button: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 5 }, buttonText: { marginLeft: 5 }, map: { width: width - 20, height: height / 3, borderRadius: 10 }, locationCard: { padding: 10, borderRadius: 5, marginVertical: 5 }, locationTitle: { fontWeight: 'bold' }, locationDescription: { marginTop: 2 }, locationDistance: { marginTop: 5, fontStyle: 'italic' }, modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }, modalContent: { padding: 20, borderRadius: 10, alignItems: 'center' }, modalImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 10 }, modalTitle: { fontWeight: 'bold', marginBottom: 5 }, modalText: { textAlign: 'center', marginBottom: 10 }, closeButton: { padding: 10, borderRadius: 5 }, closeButtonText: { textAlign: 'center' }, customMarker: { alignItems: 'center', justifyContent: 'center' }, markerImage: { width: 30, height: 30, borderRadius: 15 }, markerIcon: { position: 'absolute', top: 10 }, });

export default LocationsScreen;