import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'; // Add this import
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../context/appstate/AuthContext';
import { useTheme, Snackbar } from "react-native-paper";  // Add this import

const Profile = () => {
  const router = useRouter(); // Add this
  const { colors } = useTheme();  // Add theme hook
  const { currentUser } = useAuth();
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

  // Add this useEffect for authentication check
  useEffect(() => {
    if (!currentUser) {
      router.replace('/(auth)/sign-in');
    }
  }, [currentUser]);

  // If not authenticated, return null to prevent rendering the protected content
  if (!currentUser) return null;

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
      
      setUserData(prev => ({
        ...prev,
        location: locationDetails
      }));
    } catch (error) {
      console.error('Error getting location details:', error);
      Alert.alert('Error', 'Failed to get location details');
    }
  };

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
        console.log("Image URI:", uri);
        setNewPhotoUri(uri);
      } else {
        console.log("Image picking canceled or failed");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was an issue picking the image. Please try again.");
    }
  };

  const uploadProfilePhoto = async () => {
    if (!newPhotoUri || !userData?.displayName) return null;

    try {
      const response = await fetch(newPhotoUri);
      const blob = await response.blob();
      
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
      const updatedFields = {};

      if (userData.displayName) updatedFields.displayName = userData.displayName;
      if (userData.phoneNumber) updatedFields.phoneNumber = userData.phoneNumber;
     
      if (userData.location) updatedFields.location = userData.location;
      
      if (newPhotoUri) {
        const profilePic = await uploadProfilePhoto();
        if (profilePic) {
          updatedFields.profilePic = profilePic;
        }
      }

      const userDocRef = doc(db, 'users', userData.id);
      await updateDoc(userDocRef, updatedFields);

      if (currentUser?.role === 'cooperative') {
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
              status: 'approved'
            };
            
            if (userData.region) {
              registrationFields.region = userData.region;
            }

            await updateDoc(doc(db, 'registration', registrationDoc.id), registrationFields);
            console.log('Updated cooperative profile in both collections');
          }
        } catch (regError) {
          console.error('Error updating registration:', regError);
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

  if (!userData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#191970" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.primary }]}>Update Profile</Text>

        <TouchableOpacity onPress={pickImage}>
          <Image 
            source={
              newPhotoUri 
                ? { uri: newPhotoUri }
                : userData.profilePic 
                  ? { uri: userData.profilePic }
                  : require('../../assets/images/default_cooperative.png')
            } 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
        <Text style={[styles.photoText, { color: colors.primary }]}>Tap to change profile photo</Text>

        {currentUser?.role === 'individual' ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter your name"
                value={userData?.displayName || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Cooperative Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter cooperative name"
                value={userData?.displayName || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter phone number"
                value={userData?.phoneNumber || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, phoneNumber: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Description</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Enter business description"
                value={userData?.content || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, content: text }))}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Location</Text>
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
          style={[styles.updateButton, { backgroundColor: colors.primary, marginTop: 20 }]} 
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
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
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
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  locationText: {
    marginTop: 5,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
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
    marginBottom: 8,
    paddingLeft: 2,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  }
});

export default Profile;
