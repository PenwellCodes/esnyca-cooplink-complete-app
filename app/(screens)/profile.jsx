import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../context/appstate/AuthContext'; // Add this import

const Profile = () => {
  const { currentUser } = useAuth(); // Add this hook
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [mapType, setMapType] = useState('standard');
  const navigation = useNavigation();
  const db = getFirestore();
  const storage = getStorage();
  const auth = getAuth();

  // Add this useEffect to get initial location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  // Add this function to handle long press on map
  const handleMapLongPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      const locationDetails = {
        latitude,
        longitude,
        name: address ? `${address.street || ''} ${address.city || ''} ${address.region || ''}` : 'Selected Location',
      };
      
      setSelectedLocation(locationDetails);
      setLocationName(locationDetails.name);
      
      // Update userData with location
      setUserData(prev => ({
        ...prev,
        location: locationDetails
      }));
    } catch (error) {
      console.error('Error getting location details:', error);
      Alert.alert('Error', 'Failed to get location details');
    }
  };

  // Add this useEffect to fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      setIsLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', auth.currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          setUserData({ id: userDoc.id, ...userData });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Choose a new profile photo with additional logging
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        console.log("Image URI:", uri); // Log the URI for debugging
        setNewPhotoUri(uri);
      } else {
        console.log("Image picking canceled or failed");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was an issue picking the image. Please try again.");
    }
  };

  // Modified uploadProfilePhoto function
  const uploadProfilePhoto = async () => {
    if (!newPhotoUri || !userData?.displayName) return null;

    try {
      const response = await fetch(newPhotoUri);
      const blob = await response.blob();
      
      // Use displayName and timestamp for unique filename
      const fileName = `${userData.displayName}_${Date.now()}.jpg`;
      const photoRef = ref(storage, `profilePhotos/${fileName}`);

      await uploadBytes(photoRef, blob);
      return await getDownloadURL(photoRef);
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert("Error", "Failed to upload profile photo");
      return null;
    }
  };

  const updateProfile = async () => {
    if (!userData) return;

    setIsLoading(true);
    try {
      // Create updatedFields object only with defined values
      const updatedFields = {};

      // Only add fields if they exist and are not undefined
      if (userData.displayName) updatedFields.displayName = userData.displayName;
      if (userData.phoneNumber) updatedFields.phoneNumber = userData.phoneNumber;
     
      if (userData.location) updatedFields.location = userData.location;
      
      // Handle photo upload
      if (newPhotoUri) {
        const photoUrl = await uploadProfilePhoto();
        if (photoUrl) {
          updatedFields.photoUrl = photoUrl;
        }
      }

      // Update in users collection
      const userDocRef = doc(db, 'users', userData.id);
      await updateDoc(userDocRef, updatedFields);

      // If this is a cooperative user, update registration collection
      if (currentUser?.role === 'cooperative') {  // Use currentUser.role here
        try {
          const registrationQuery = query(
            collection(db, 'registration'),
            where('email', '==', userData.email)
          );
          const registrationDocs = await getDocs(registrationQuery);

          if (!registrationDocs.empty) {
            const registrationDoc = registrationDocs.docs[0];
            const registrationFields = {
              ...updatedFields,
              status: 'approved' // Maintain approved status
            };
            
            // Only add region if it exists
            if (userData.region) {
              registrationFields.region = userData.region;
            }

            await updateDoc(doc(db, 'registration', registrationDoc.id), registrationFields);
            console.log('Updated cooperative profile in both collections');
          }
        } catch (regError) {
          console.error('Error updating registration:', regError);
          // Continue execution even if registration update fails
        }
      }

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please check your input data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add initial data check in the return statement
  if (!userData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#191970" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>Update Profile</Text>

        {/* Profile Picture section with null check */}
        <TouchableOpacity onPress={pickImage}>
          <Image 
            source={
              newPhotoUri 
                ? { uri: newPhotoUri }
                : userData.photoUrl 
                  ? { uri: userData.photoUrl }
                  : require('../../assets/images/default_cooperative.png')
            } 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
        <Text style={styles.photoText}>Tap to change profile photo</Text>

        {currentUser?.role === 'individual' ? (  // Use currentUser.role here
          // Individual user fields with null checks
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={userData?.name || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, name: text }))}
              />
            </View>
          </>
        ) : (
          // Business/Cooperative user fields with null checks
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cooperative name"
                value={userData?.displayName || ''} // Changed from cooperativeName
                onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))} // Changed from cooperativeName
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={userData?.phoneNumber || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, phoneNumber: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter business description"
                value={userData?.content || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, content: text }))}
              />
            </View>

            <Text style={styles.sectionTitle}>Location</Text>
            {location && (
              <View style={styles.mapContainer}>
                <TouchableOpacity 
                  style={styles.mapTypeButton}
                  onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
                >
                  <Text style={styles.mapTypeButtonText}>
                    {mapType === 'standard' ? 'Satellite View' : 'Standard View'}
                  </Text>
                </TouchableOpacity>

                <MapView
                  style={styles.map}
                  initialRegion={location}
                  mapType={mapType}
                  onLongPress={handleMapLongPress}
                >
                  {selectedLocation && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude
                      }}
                      title={locationName}
                    />
                  )}
                </MapView>
                {selectedLocation && (
                  <Text style={styles.locationText}>
                    Selected: {locationName}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity 
          style={[styles.updateButton, { marginTop: 20 }]} 
          onPress={updateProfile} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    color: '#191970',
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#191970',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  photoText: {
    color: '#191970',
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#191970',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: '#191970',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#191970',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  locationText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mapTypeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 5,
    zIndex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mapTypeButtonText: {
    color: '#191970',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191970',
    marginBottom: 8,
    paddingLeft: 2,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#191970',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  }
});

export default Profile;
