import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const AddStoryScreen = () => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { currentUser } = useAuth();
  const { postStory } = useStories();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();

  const [imageURI, setImageURI] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(4 / 3);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [inputPositions, setInputPositions] = useState({});
  const scrollViewRef = useRef(null);

  const [translations, setTranslations] = useState({
    addStory: "Add Story",
    permissionRequired: "Permission required",
    permissionBody: "We need media library permissions to pick an image.",
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
        selectImageBody: await t("Please select an image for your story."),
        changeImage: await t("Change Image"),
        pickImage: await t("Pick an Image"),
        addCaption: await t("Add a caption..."),
        postStory: await t("Post Story"),
        success: await t("Success"),
        storyPostedSuccessfully: await t("Story posted successfully!"),
        error: await t("Error"),
        failedToPostStory: await t("Failed to post story. Please try again."),
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageURI(asset.uri);
      if (asset.width && asset.height) {
        setImageAspectRatio(asset.width / asset.height);
      }
    }
  };

  // ✅ FIXED: Call postStory with the correct object parameter
  const handlePostStory = async () => {
    if (!imageURI) {
      Alert.alert(translations.noImageSelected, translations.selectImageBody);
      return;
    }
    if (!currentUser?.uid) {
      Alert.alert(translations.error, "User not logged in");
      return;
    }
    setUploading(true);
    try {
      await postStory({
        imageURI: imageURI,
        caption: caption,
        userId: currentUser.uid,
      });
      Alert.alert(translations.success, translations.storyPostedSuccessfully);
      router.back();
    } catch (error) {
      console.error("Error posting story:", error);
      Alert.alert(translations.error, translations.failedToPostStory);
    } finally {
      setUploading(false);
    }
  };

  const handleInputLayout = (key) => (event) => {
    const { y } = event.nativeEvent.layout;
    setInputPositions((prev) => ({ ...prev, [key]: y }));
  };

  const scrollToInput = (key) => {
    const y = inputPositions[key];
    if (typeof y !== "number") return;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }, 100);
  };

  const handlePostStory = async () => {
    if (!imageURI) {
      Alert.alert(
        translations.noImageSelected,
        translations.selectImageBody
      );
      return;
    }

    const userId = currentUser?.uid || currentUser?.id;
    if (!userId) {
      Alert.alert(translations.error, translations.failedToPostStory);
      return;
    }

    setUploading(true);
    try {
      await postStory({
        imageURI,
        caption: caption.trim(),
        userId,
      });
      Alert.alert(translations.success, translations.storyPostedSuccessfully, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error posting story:", error);
      Alert.alert(
        translations.error,
        error?.message || translations.failedToPostStory
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 48 : 24}
    >
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              32 + keyboardHeight + Math.max(insets.bottom, 12),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.header}>{translations.addStory}</Text>
        <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
          <Text style={styles.pickImageText}>
            {imageURI ? translations.changeImage : translations.pickImage}
          </Text>
        </TouchableOpacity>
        {imageURI ? (
          <Image
            source={{ uri: imageURI }}
            style={[styles.previewImage, { aspectRatio: imageAspectRatio }]}
            resizeMode="contain"
          />
        ) : null}
        <View onLayout={handleInputLayout("caption")}>
          <TextInput
            style={styles.input}
            placeholder={translations.addCaption}
            placeholderTextColor="#6B7280"
            value={caption}
            onChangeText={setCaption}
            onFocus={() => scrollToInput("caption")}
          />
        </View>
        {uploading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.postButton} onPress={handlePostStory}>
            <Text style={styles.postButtonText}>{translations.postStory}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddStoryScreen;

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
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
    maxHeight: 480,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
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