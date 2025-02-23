import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";
import { useRouter } from "expo-router";

const AddStoryScreen = () => {
  const { currentUser } = useAuth();
  const { postStory } = useStories();
  const router = useRouter();

  const [imageURI, setImageURI] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need media library permissions to pick an image.");
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageURI(result.assets[0].uri);
    }
  };

  const handlePostStory = async () => {
    if (!imageURI) {
      Alert.alert("No image selected", "Please select an image for your story.");
      return;
    }
    setUploading(true);
    try {
      // Post the story using our StoriesContext function
      await postStory({ imageURI, caption, userId: currentUser.uid });
      Alert.alert("Success", "Story posted successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to post story. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Story</Text>
      <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
        <Text style={styles.pickImageText}>{imageURI ? "Change Image" : "Pick an Image"}</Text>
      </TouchableOpacity>
      {imageURI && <Image source={{ uri: imageURI }} style={styles.previewImage} />}
      <TextInput
        style={styles.input}
        placeholder="Add a caption..."
        value={caption}
        onChangeText={setCaption}
      />
      {uploading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <TouchableOpacity style={styles.postButton} onPress={handlePostStory}>
          <Text style={styles.postButtonText}>Post Story</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AddStoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  pickImageButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  pickImageText: {
    color: "#fff",
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  postButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  postButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
