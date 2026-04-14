import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; // Add this import
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/appstate/AuthContext';
import { useLanguage } from '../../context/appstate/LanguageContext';
import { useTheme, Snackbar } from "react-native-paper";  // Add this import
import { apiRequest } from "../../utils/api";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const Profile = () => {
  const router = useRouter(); // Add this
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { colors } = useTheme();  // Add theme hook
  const { currentUser } = useAuth();
  const { currentLanguage, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [mapType, setMapType] = useState('standard');
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const navigation = useNavigation();

  const [translations, setTranslations] = useState({
    updateProfile: "Update Profile",
    tapToChangePhoto: "Tap to change profile photo",
    name: "Name",
    cooperativeName: "Cooperative Name",
    phoneNumber: "Phone Number",
    productService: "Product/Service",
    location: "Location",
    satelliteView: "Satellite View",
    standardView: "Standard View",
    selected: "Selected",
    loadingProfileData: "Loading profile data...",
    updateProfileButton: "Update Profile",
    enterYourName: "Enter your name",
    enterCooperativeName: "Enter cooperative name",
    enterPhoneNumber: "Enter phone number",
    enterProductService: "Enter product/service",
    email: "Email",
    enterEmail: "Enter email",
    currentPassword: "Current Password",
    enterCurrentPassword: "Enter current password",
    newPassword: "New Password",
    enterNewPassword: "Enter new password",
    confirmNewPassword: "Confirm New Password",
    reEnterNewPassword: "Re-enter new password",
    permissionDeniedTitle: "Permission denied",
    permissionDeniedBody: "Location permission is required",
    error: "Error",
    success: "Success",
    failedGetLocationDetails: "Failed to get location details",
    failedLoadProfileData: "Failed to load profile data",
    failedPickImage: "There was an issue picking the image. Please try again.",
    failedUploadProfilePhoto: "Failed to upload profile photo",
    profileUpdatedSuccessfully: "Profile updated successfully",
    failedUpdateProfile: "Failed to update profile. Please check your input data.",
    passwordFieldsRequired: "Current password and new password are required to change password.",
    passwordMismatch: "New password and confirm password do not match.",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        updateProfile: await t("Update Profile"),
        tapToChangePhoto: await t("Tap to change profile photo"),
        name: await t("Name"),
        cooperativeName: await t("Cooperative Name"),
        phoneNumber: await t("Phone Number"),
        productService: await t("Product/Service"),
        location: await t("Location"),
        satelliteView: await t("Satellite View"),
        standardView: await t("Standard View"),
        selected: await t("Selected"),
        loadingProfileData: await t("Loading profile data..."),
        updateProfileButton: await t("Update Profile"),
        enterYourName: await t("Enter your name"),
        enterCooperativeName: await t("Enter cooperative name"),
        enterPhoneNumber: await t("Enter phone number"),
        enterProductService: await t("Enter product/service"),
        email: await t("Email"),
        enterEmail: await t("Enter email"),
        currentPassword: await t("Current Password"),
        enterCurrentPassword: await t("Enter current password"),
        newPassword: await t("New Password"),
        enterNewPassword: await t("Enter new password"),
        confirmNewPassword: await t("Confirm New Password"),
        reEnterNewPassword: await t("Re-enter new password"),
        permissionDeniedTitle: await t("Permission denied"),
        permissionDeniedBody: await t("Location permission is required"),
        error: await t("Error"),
        success: await t("Success"),
        failedGetLocationDetails: await t("Failed to get location details"),
        failedLoadProfileData: await t("Failed to load profile data"),
        failedPickImage: await t(
          "There was an issue picking the image. Please try again."
        ),
        failedUploadProfilePhoto: await t("Failed to upload profile photo"),
        profileUpdatedSuccessfully: await t("Profile updated successfully"),
        failedUpdateProfile: await t(
          "Failed to update profile. Please check your input data."
        ),
        passwordFieldsRequired: await t(
          "Current password and new password are required to change password."
        ),
        passwordMismatch: await t(
          "New password and confirm password do not match."
        ),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Add this useEffect for authentication check
  useEffect(() => {
    if (!currentUser) {
      const returnTo = encodeURIComponent("/(screens)/profile");
      router.replace(`/(auth)/sign-in?returnTo=${returnTo}`);
    }
  }, [currentUser]);

  // If not authenticated, return null to prevent rendering the protected content
  if (!currentUser) return null;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          translations.permissionDeniedTitle,
          translations.permissionDeniedBody
        );
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
        name: address
          ? `${address.street || ""} ${address.city || ""} ${address.region || ""}`
          : `${translations.selected} Location`,
      };
      
      setSelectedLocation(locationDetails);
      setLocationName(locationDetails.name);
      
      setUserData(prev => ({
        ...prev,
        location: locationDetails
      }));
    } catch (error) {
      console.error('Error getting location details:', error);
      Alert.alert(translations.error, translations.failedGetLocationDetails);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        if (!currentUser?.id) return;
        const profile = await apiRequest(`/users/${currentUser.id}`);
        setUserData({
          id: profile.Id || profile.id,
          displayName: profile.DisplayName || profile.displayName || "",
          email: profile.Email || profile.email || currentUser.email || "",
          role: profile.Role || profile.role || currentUser.role || "individual",
          phoneNumber: profile.PhoneNumber || profile.phoneNumber || "",
          content: profile.Content || profile.content || "",
          profilePic:
            profile.ProfilePicUrl ||
            profile.profilePicUrl ||
            profile.ProfilePic ||
            profile.profilePic ||
            "",
          locationLat: profile.LocationLat ?? profile.locationLat ?? null,
          locationLng: profile.LocationLng ?? profile.locationLng ?? null,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert(translations.error, translations.failedLoadProfileData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser?.id]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
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
      Alert.alert(translations.error, translations.failedPickImage);
    }
  };

  const uploadProfilePhoto = async () => {
    if (!newPhotoUri || !userData?.displayName) return null;

    try {
      const fileName = `${userData.displayName}_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("image", {
        uri: newPhotoUri,
        name: fileName,
        type: "image/jpeg",
      });
      const uploadResult = await apiRequest("/upload", {
        method: "POST",
        body: formData,
        timeoutMs: 60000,
      });
      return uploadResult?.imageUrl || null;
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert(translations.error, translations.failedUploadProfilePhoto);
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
      if (userData.content) updatedFields.content = userData.content; // Add content field
      if (userData.email) updatedFields.email = userData.email.trim().toLowerCase();
      if (userData.location?.latitude) {
        updatedFields.locationLat = userData.location.latitude;
      }
      if (userData.location?.longitude) {
        updatedFields.locationLng = userData.location.longitude;
      }
      
      if (newPhotoUri) {
        const profilePic = await uploadProfilePhoto();
        if (!profilePic) {
          throw new Error("Image upload failed");
        }
        updatedFields.profilePicUrl = profilePic;
      }

      const hasAnyPasswordInput =
        currentPassword.trim() || newPassword.trim() || confirmNewPassword.trim();
      if (hasAnyPasswordInput) {
        if (!currentPassword.trim() || !newPassword.trim()) {
          Alert.alert(translations.error, translations.passwordFieldsRequired);
          setIsLoading(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          Alert.alert(translations.error, translations.passwordMismatch);
          setIsLoading(false);
          return;
        }
        updatedFields.currentPassword = currentPassword;
        updatedFields.password = newPassword;
      }

      const updatedUser = await apiRequest(`/users/${userData.id}`, {
        method: "PUT",
        body: updatedFields,
      });

      setUserData((prev) => ({
        ...prev,
        email: updatedUser?.Email || updatedUser?.email || prev?.email || "",
        profilePic:
          updatedUser?.ProfilePicUrl ||
          updatedUser?.profilePicUrl ||
          updatedFields.profilePicUrl ||
          prev?.profilePic ||
          "",
      }));
      setNewPhotoUri(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      Alert.alert(translations.success, translations.profileUpdatedSuccessfully);
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        translations.error,
        error?.message || translations.failedUpdateProfile
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#191970" />
        <Text style={styles.loadingText}>{translations.loadingProfileData}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardRoot, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 24}
    >
      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              40 + keyboardHeight + Math.max(insets.bottom, 12),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.primary }]}>
          {translations.updateProfile}
        </Text>

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
        <Text style={[styles.photoText, { color: colors.primary }]}>
          {translations.tapToChangePhoto}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.primary }]}>
            {translations.email}
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
            placeholder={translations.enterEmail}
            placeholderTextColor={colors.onSurfaceVariant}
            value={userData?.email || ''}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
          />
        </View>

        {currentUser?.role === 'individual' ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                {translations.name}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
                placeholder={translations.enterYourName}
                placeholderTextColor={colors.onSurfaceVariant}
                value={userData?.displayName || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                {translations.cooperativeName}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
                placeholder={translations.enterCooperativeName}
                placeholderTextColor={colors.onSurfaceVariant}
                value={userData?.displayName || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                {translations.phoneNumber}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
                placeholder={translations.enterPhoneNumber}
                placeholderTextColor={colors.onSurfaceVariant}
                value={userData?.phoneNumber || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, phoneNumber: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>
                {translations.productService}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
                placeholder={translations.enterProductService}
                placeholderTextColor={colors.onSurfaceVariant}
                value={userData?.content || ''}
                onChangeText={(text) => setUserData(prev => ({ ...prev, content: text }))}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {translations.location}
            </Text>
            {location && (
              <View style={styles.mapContainer}>
                <TouchableOpacity 
                  style={styles.mapTypeButton}
                  onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
                >
                  <Text style={styles.mapTypeButtonText}>
                    {mapType === 'standard'
                      ? translations.satelliteView
                      : translations.standardView}
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
                    {translations.selected}: {locationName}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.primary }]}>
            {translations.currentPassword}
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
            placeholder={translations.enterCurrentPassword}
            placeholderTextColor={colors.onSurfaceVariant}
            value={currentPassword}
            secureTextEntry
            autoCapitalize="none"
            onChangeText={setCurrentPassword}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.primary }]}>
            {translations.newPassword}
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
            placeholder={translations.enterNewPassword}
            placeholderTextColor={colors.onSurfaceVariant}
            value={newPassword}
            secureTextEntry
            autoCapitalize="none"
            onChangeText={setNewPassword}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.primary }]}>
            {translations.confirmNewPassword}
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.primary, color: colors.onSurface }]}
            placeholder={translations.reEnterNewPassword}
            placeholderTextColor={colors.onSurfaceVariant}
            value={confirmNewPassword}
            secureTextEntry
            autoCapitalize="none"
            onChangeText={setConfirmNewPassword}
          />
        </View>

        <TouchableOpacity 
          style={[styles.updateButton, { backgroundColor: colors.primary, marginTop: 20 }]} 
          onPress={updateProfile} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.updateButtonText}>
              {translations.updateProfileButton}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
