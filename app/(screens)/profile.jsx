import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LocationsScreen from '../(tabs)/LocationsScreen'; // Import the map picker

const ProfileScreen = () => {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    profilePic: "",
    physicalAddress: "",
    phoneNumbers: [],
    location: {
      latitude: null,
      longitude: null,
    },
  });

  const handleSaveProfile = () => {
    console.log("Profile Data:", formData);
    // TODO: Save profile data to Firebase here
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Display Name"
        value={formData.displayName}
        onChangeText={(text) => setFormData({ ...formData, displayName: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Physical Address"
        value={formData.physicalAddress}
        onChangeText={(text) => setFormData({ ...formData, physicalAddress: text })}
      />

      {/* Map Picker Component */}
      <LocationsScreen formData={formData} setFormData={setFormData} />

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  input: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
