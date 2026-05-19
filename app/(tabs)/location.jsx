import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/FontAwesome';
import haversine from 'haversine';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../context/appstate/LanguageContext';
import { apiRequest } from '../../utils/api';
import {
  CACHE_KEYS,
  readDataCache,
  writeDataCache,
  subscribeNetUsable,
} from '../../utils/dataCache';
import LeafletMap from '../../components/LeafletMap';
import FetchState from '../../components/FetchState';

const { height } = Dimensions.get('window');

async function mapUsersToMapLocations(usersRaw, t) {
  const locations = (usersRaw || [])
    .map((item) => ({
      id: item.Id || item.id,
      latitude: parseFloat(item.LocationLat),
      longitude: parseFloat(item.LocationLng),
      title: item.DisplayName || 'Unknown Company',
      description: item.Content || 'No description available',
      photoUrl: item.ProfilePicUrl,
      companyAddress: item.CompanyAddress,
    }))
    .filter((location) => location.latitude && location.longitude);

  return Promise.all(
    locations.map(async (location) => ({
      ...location,
      title: await t(location.title || ''),
      description: await t(location.description || ''),
      companyAddress: await t(location.companyAddress || ''),
    }))
  );
}

const LocationsScreen = () => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [radius, setRadius] = useState(1000);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [userLocations, setUserLocations] = useState([]);
  const [routeCoords, setRouteCoords] = useState(null);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [pinsLoadError, setPinsLoadError] = useState(null);

  const mapRef = useRef(null);

  const { t } = useLanguage();
  const [translations, setTranslations] = useState({
    searchPlaceholder: 'Search for a location',
    permissionDenied: 'Permission to access location was denied.',
    errorFetching: 'Error fetching current location.',
    errorLoadingLocations: 'Error loading user locations',
    radiusLabel: 'Radius',
    clear: 'Clear',
    switchView: 'Switch View',
    recenter: 'Re-center',
    distanceLabel: 'Distance',
    routeUnavailableTitle: 'Location unavailable',
    routeUnavailableBody: 'Your current location is required for routing.',
    quickestRoute: 'Quickest Route',
    close: 'Close',
    address: 'Address',
    loadingPins: 'Loading locations...',
    networkError:
      'Unable to load locations. Please check your internet connection.',
    tryAgain: 'Try again',
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        searchPlaceholder: await t('Search for a location'),
        permissionDenied: await t('Permission to access location was denied.'),
        errorFetching: await t('Error fetching current location.'),
        errorLoadingLocations: await t('Error loading user locations'),
        radiusLabel: await t('Radius'),
        clear: await t('Clear'),
        switchView: await t('Switch View'),
        recenter: await t('Re-center'),
        distanceLabel: await t('Distance'),
        routeUnavailableTitle: await t('Location unavailable'),
        routeUnavailableBody: await t(
          'Your current location is required for routing.'
        ),
        quickestRoute: await t('Quickest Route'),
        close: await t('Close'),
        address: await t('Address'),
        loadingPins: await t('Loading locations...'),
        networkError: await t(
          'Unable to load locations. Please check your internet connection.'
        ),
        tryAgain: await t('Try again'),
      });
    };
    loadTranslations();
  }, [t]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage(await t('Permission to access location was denied.'));
          setLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch {
        setErrorMessage(await t('Error fetching current location.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchUserLocations = useCallback(async () => {
    setPinsLoadError(null);
    setPinsLoading(true);
    const cachedRaw = await readDataCache(CACHE_KEYS.USERS);

    if (Array.isArray(cachedRaw) && cachedRaw.length > 0) {
      try {
        const localized = await mapUsersToMapLocations(cachedRaw, t);
        setUserLocations(localized);
        setSearchResults(localized);
        setPinsLoading(false);
      } catch {
        /* fall through to network */
      }
    }

    try {
      const usersRaw = await apiRequest('/users');
      await writeDataCache(CACHE_KEYS.USERS, usersRaw);
      const localized = await mapUsersToMapLocations(usersRaw, t);
      setUserLocations(localized);
      setSearchResults(localized);
      setErrorMessage('');
      setPinsLoadError(null);
    } catch (error) {
      console.error('Error fetching user locations:', error);
      if (!Array.isArray(cachedRaw) || cachedRaw.length === 0) {
        setPinsLoadError(translations.networkError);
        setErrorMessage(await t('Error loading user locations'));
      }
    } finally {
      setPinsLoading(false);
    }
  }, [t, translations.networkError]);

  useEffect(() => {
    fetchUserLocations();
    const unsubNet = subscribeNetUsable(() => {
      fetchUserLocations();
    });
    return unsubNet;
  }, [fetchUserLocations]);

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
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      { latitude: lat, longitude: lng },
      { unit: 'km' }
    );
    return distance.toFixed(2);
  };

  const recenterMap = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.recenter(currentLocation, 14);
    }
  };

  const drawQuickestRouteOnMap = (location) => {
    if (!currentLocation) {
      Alert.alert(
        translations.routeUnavailableTitle,
        translations.routeUnavailableBody
      );
      return;
    }

    const origin = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    };
    const destination = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const coords = [origin, destination];
    setRouteCoords(coords);

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(coords);
    }
  };

  const handleMarkerPress = ({ id }) => {
    const location = searchResults.find(
      (item) => String(item.id) === String(id)
    );
    if (location) {
      setRouteCoords(null);
      setSelectedLocation(location);
    }
  };

  const mapCenter = useMemo(
    () =>
      currentLocation ?? {
        latitude: -26.5225,
        longitude: 31.4659,
      },
    [currentLocation]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <StatusBar style="dark" backgroundColor="#F5F5F5" />
      <View style={styles.controlsSection}>
        <TextInput
          style={styles.searchInput}
          placeholder={translations.searchPlaceholder}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
          onSubmitEditing={handleSearch}
        />
        {errorMessage && !pinsLoadError ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {pinsLoadError && !userLocations.length ? (
          <FetchState
            loading={false}
            error={pinsLoadError}
            onRetry={fetchUserLocations}
            errorText={translations.networkError}
            retryText={translations.tryAgain}
          />
        ) : null}

        {(loading || pinsLoading) && !userLocations.length && !pinsLoadError ? (
          <FetchState
            loading
            loadingText={translations.loadingPins}
            color="#007AFF"
          />
        ) : null}

        <View style={styles.controlContainer}>
          <Text style={styles.controlLabel}>
            {translations.radiusLabel}: {radius / 1000} km
          </Text>
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
            <Text style={styles.buttonText}>{translations.clear}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const next = mapType === 'standard' ? 'satellite' : 'standard';
              setMapType(next);
              mapRef.current?.setMapType(next);
            }}
          >
            <Icon name="map" size={20} color="#FFF" />
            <Text style={styles.buttonText}>{translations.switchView}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={recenterMap}>
            <Icon name="location-arrow" size={20} color="#FFF" />
            <Text style={styles.buttonText}>{translations.recenter}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.resultsList}
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          nestedScrollEnabled
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => {
                setRouteCoords(null);
                setSelectedLocation(item);
              }}
            >
              <Text style={styles.resultText}>
                {item.title} - {calculateDistance(item.latitude, item.longitude)}{' '}
                km
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <LeafletMap
        ref={mapRef}
        style={styles.map}
        center={mapCenter}
        zoom={13}
        mapType={mapType}
        markers={searchResults}
        userLocation={currentLocation}
        circle={
          currentLocation
            ? { center: currentLocation, radius }
            : undefined
        }
        polyline={routeCoords}
        onMarkerPress={handleMarkerPress}
        interactive={false}
      />

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
                {translations.address}: {selectedLocation.companyAddress}
              </Text>
            )}
            <Text style={styles.modalDistance}>
              {translations.distanceLabel}:{' '}
              {calculateDistance(
                selectedLocation.latitude,
                selectedLocation.longitude
              )}{' '}
              km
            </Text>
            <TouchableOpacity
              style={[styles.closeButton, { marginTop: 10 }]}
              onPress={() => drawQuickestRouteOnMap(selectedLocation)}
            >
              <Text style={styles.closeButtonText}>
                {translations.quickestRoute}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setRouteCoords(null);
                setSelectedLocation(null);
              }}
            >
              <Text style={styles.closeButtonText}>{translations.close}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 20,
  },
  controlsSection: {
    maxHeight: height * 0.42,
  },
  resultsList: {
    maxHeight: height * 0.18,
  },
  searchInput: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    fontSize: 16,
    color: '#111827',
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
    flex: 1,
    width: '100%',
    minHeight: height * 0.35,
    borderRadius: 10,
    marginVertical: 10,
    overflow: 'hidden',
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
