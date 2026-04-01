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
import { useLanguage } from "../../context/appstate/LanguageContext";

const AddStoryScreen = () => {
  const { currentUser } = useAuth();
  const { postStory } = useStories();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();

  const [imageURI, setImageURI] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const [translations, setTranslations] = useState({
    addStory: "Add Story",
    permissionRequired: "Permission required",
    permissionBody:
      "We need media library permissions to pick an image.",
    noImageSelected: "No image selected",
    selectImageBody: "Please select an image for your story.",
    changeImage: "Change Image",
    pickImage: "Pick an Image",
    addCaption: "Add a caption...",
    postStory: "Post Story",
    success: "Success",
    storyPostedSuccessfully: "Story posted successfully!",
    error: "Error",
    failedToPostStory: "Failed to post story. Please try again.",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        addStory: await t("Add Story"),
        permissionRequired: await t("Permission required"),
        permissionBody: await t(
          "We need media library permissions to pick an image."
        ),
        noImageSelected: await t("No image selected"),
        selectImageBody: await t(
          "Please select an image for your story."
        ),
        changeImage: await t("Change Image"),
        pickImage: await t("Pick an Image"),
        addCaption: await t("Add a caption..."),
        postStory: await t("Post Story"),
        success: await t("Success"),
        storyPostedSuccessfully: await t("Story posted successfully!"),
        error: await t("Error"),
        failedToPostStory: await t(
          "Failed to post story. Please try again."
        ),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          translations.permissionRequired,
          translations.permissionBody
        );
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
      Alert.alert(
        translations.noImageSelected,
        translations.selectImageBody
      );
      return;
    }
    setUploading(true);
    try {
      // Post the story using our StoriesContext function
      await postStory({ imageURI, caption, userId: currentUser.uid });
      Alert.alert(translations.success, translations.storyPostedSuccessfully);
      router.back();
    } catch (error) {
      Alert.alert(translations.error, translations.failedToPostStory);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{translations.addStory}</Text>
      <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
        <Text style={styles.pickImageText}>
          {imageURI ? translations.changeImage : translations.pickImage}
        </Text>
      </TouchableOpacity>
      {imageURI && <Image source={{ uri: imageURI }} style={styles.previewImage} />}
      <TextInput
        style={styles.input}
        placeholder={translations.addCaption}
        value={caption}
        onChangeText={setCaption}
      />
      {uploading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <TouchableOpacity style={styles.postButton} onPress={handlePostStory}>
          <Text style={styles.postButtonText}>{translations.postStory}</Text>
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




