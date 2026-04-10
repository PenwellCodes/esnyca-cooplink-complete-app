import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../../../context/appstate/ChatContext";
import { useAuth } from "../../../context/appstate/AuthContext";
import { useTheme } from "react-native-paper";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/appstate/LanguageContext";
import { apiRequest } from "../../../utils/api";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const ChatScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const user = params.user ? JSON.parse(params.user) : null;
  const predefinedMessage = params.predefinedMessage;
  const { currentUser } = useAuth();
  const { conversations, markMessagesAsRead, setActiveChatId, sendMessage: sendChatMessage } =
    useChat();
  const chatId =
    currentUser.uid > user.uid
      ? `${currentUser.uid}_${user.uid}`
      : `${user.uid}_${currentUser.uid}`;

  // State for text messages and local messages
  const [messageText, setMessageText] = useState(predefinedMessage || "");
  const [localMessages, setLocalMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);

  const [selectedDocuments, setSelectedDocuments] = useState([]);

  const contextMessages = conversations[chatId] || [];
  const messages = [...contextMessages, ...localMessages];
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentLanguage, t } = useLanguage();

  const [translations, setTranslations] = useState({
    permissionRequiredTitle: "Permission Required",
    permissionRequiredBody:
      "Sorry, we need media library permissions to make this work!",
    startConversation: "Start a conversation",
    typeMessage: "Type a message...",
    download: "Download",
    sending: "Sending...",
    error: "Error",
    failedPickDocument: "Failed to pick document",
    failedSendDocument: "Failed to send document",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        permissionRequiredTitle: await t("Permission Required"),
        permissionRequiredBody: await t(
          "Sorry, we need media library permissions to make this work!"
        ),
        startConversation: await t("Start a conversation"),
        typeMessage: await t("Type a message..."),
        download: await t("Download"),
        sending: await t("Sending..."),
        error: await t("Error"),
        failedPickDocument: await t("Failed to pick document"),
        failedSendDocument: await t("Failed to send document"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          translations.permissionRequiredTitle,
          translations.permissionRequiredBody
        );
      }
    })();
  }, []);

  useEffect(() => {
    markMessagesAsRead(chatId, messages);
  }, [messages]);

  // Add this useEffect to mark messages as read when the chat is opened
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead(chatId, messages);
    }
  }, [messages, chatId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    // Check if there's a story preview in the params
    const storyPreview = params.storyPreview
      ? JSON.parse(params.storyPreview)
      : null;

    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver: user.uid,
      text: messageText,
      type: storyPreview ? "story_reply" : "text",
      storyPreview,
      timestamp: new Date(),
      status: "sent",
    };
    setLocalMessages((prev) => [...prev, tempMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      await sendChatMessage({
        chatKey: chatId,
        receiverUserId: user.uid,
        text: messageText,
        type: storyPreview ? "story_reply" : "text",
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setMessageText("");
      setLocalMessages([]);
    }
  };

  const uploadFile = async (uri, fileName = `file-${Date.now()}.jpg`) => {
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: fileName,
      type: "image/jpeg",
    });
    const uploadResult = await apiRequest("/upload", {
      method: "POST",
      body: formData,
    });
    return uploadResult?.imageUrl;
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      return result.assets[0].uri;
    }
    return null;
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Allow all file types
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        // Handle the new DocumentPicker response format
        const file = result.assets[0];
        await sendDocument(file);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert(translations.error, translations.failedPickDocument);
    }
  };

  const sendDocument = async (file) => {
    if (!file) return;

    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver: user.uid,
      fileUrl: file.uri,
      fileName: file.name,
      type: "file",
      timestamp: new Date(),
      status: "uploading",
    };

    setLocalMessages((prev) => [...prev, tempMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });
    setUploading(true);

    try {
      const downloadURL = await uploadFile(file.uri, file.name);
      await sendChatMessage({
        chatKey: chatId,
        receiverUserId: user.uid,
        type: "file",
        fileUrl: downloadURL,
        fileName: file.name,
      });
      setLocalMessages([]);
    } catch (error) {
      console.error("Error sending document:", error);
      Alert.alert(translations.error, translations.failedSendDocument);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sendImage = async () => {
    const uri = await pickImage();
    if (!uri) return;

    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver: user.uid,
      fileUrl: uri,
      type: "image",
      timestamp: new Date(),
      status: "uploading",
    };

    setLocalMessages((prev) => [...prev, tempMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });
    setUploading(true);

    try {
      const fileName = uri.split("/").pop();
      const downloadURL = await uploadFile(uri, fileName);
      await sendChatMessage({
        chatKey: chatId,
        receiverUserId: user.uid,
        type: "image",
        fileUrl: downloadURL,
        fileName,
      });
      setLocalMessages([]);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sendFile = async () => {
    const result = await pickFile();
    if (!result) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const { uri, name } = result;
      const fileName = name || uri.split("/").pop();
      const downloadURL = await uploadFile(uri, fileName);
      await sendChatMessage({
        chatKey: chatId,
        receiverUserId: user.uid,
        type: "file",
        fileUrl: downloadURL,
        fileName,
      });
    } catch (error) {
      console.error("Error sending file:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const renderMessage = ({ item }) => {
    if (item.type === "story_reply") {
      return (
        <View
          style={[
            styles.messageBubble,
            {
              alignSelf:
                item.sender === currentUser.uid ? "flex-end" : "flex-start",
            },
          ]}
        >
          {item.storyPreview?.imageURL && (
            <View style={styles.storyPreviewContainer}>
              <Image
                source={{ uri: item.storyPreview.imageURL }}
                style={styles.storyPreviewImage}
              />
              {item.storyPreview.caption && (
                <Text style={styles.storyPreviewCaption}>
                  {item.storyPreview.caption}
                </Text>
              )}
            </View>
          )}
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      );
    }
    if (item.type === "image") {
      return (
        <View
          style={{
            alignSelf:
              item.sender === currentUser.uid ? "flex-end" : "flex-start",
            marginVertical: 5,
            marginHorizontal: 10,
          }}
        >
          <LinearGradient
            colors={
              item.sender === currentUser.uid
                ? ["#4c669f", "#3b5998"]
                : ["#e0e0e0", "#cfcfcf"]
            }
            style={styles.messageBubble}
          >
            <TouchableOpacity
              onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.fileUrl }}
                style={styles.imageMessage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View style={styles.imageActions}>
              {item.status === "uploading" ? (
                <ActivityIndicator
                  size="small"
                  color={item.sender === currentUser.uid ? "#fff" : "#666"}
                  style={{ marginRight: 5 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
                  style={styles.downloadButton}
                >
                  <Ionicons
                    name="download-outline"
                    size={16}
                    color={
                      item.sender === currentUser.uid ? "#cce6ff" : "#007AFF"
                    }
                  />
                  <Text
                    style={{
                      color:
                        item.sender === currentUser.uid ? "#cce6ff" : "#007AFF",
                      marginLeft: 5,
                      fontSize: 12,
                    }}
                  >
                    {translations.download}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.timestamp}>
                {item.timestamp && typeof item.timestamp.toDate === "function"
                  ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                      addSuffix: true,
                    })
                  : translations.sending}
              </Text>
            </View>
          </LinearGradient>
        </View>
      );
    }
    if (item.type === "file") {
      return (
        <LinearGradient
          colors={
            item.sender === currentUser.uid
              ? ["#4c669f", "#3b5998"]
              : ["#e0e0e0", "#cfcfcf"]
          }
          style={[
            styles.messageBubble,
            {
              alignSelf:
                item.sender === currentUser.uid ? "flex-end" : "flex-start",
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={item.sender === currentUser.uid ? "white" : "black"}
          />
          <View style={{ marginLeft: 8 }}>
            <Text
              style={{
                color: item.sender === currentUser.uid ? "white" : "black",
                fontWeight: "bold",
              }}
            >
              {item.fileName}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
              <Text
                style={{
                  color:
                    item.sender === currentUser.uid ? "#cce6ff" : "#007AFF",
                }}
              >
                {translations.download}
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {item.timestamp && typeof item.timestamp.toDate === "function"
                ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                    addSuffix: true,
                  })
                : translations.sending}
            </Text>
          </View>
        </LinearGradient>
      );
    }
    // Treat audio messages as downloadable files (recording disabled)
    if (item.type === "audio") {
      return (
        <LinearGradient
          colors={
            item.sender === currentUser.uid
              ? ["#4c669f", "#3b5998"]
              : ["#e0e0e0", "#cfcfcf"]
          }
          style={[
            styles.messageBubble,
            {
              alignSelf:
                item.sender === currentUser.uid ? "flex-end" : "flex-start",
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          <Ionicons
            name="musical-notes-outline"
            size={24}
            color={item.sender === currentUser.uid ? "white" : "black"}
          />
          <View style={{ marginLeft: 8 }}>
            <TouchableOpacity
              onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
            >
              <Text
                style={{
                  color:
                    item.sender === currentUser.uid ? "#cce6ff" : "#007AFF",
                  fontWeight: "bold",
                }}
              >
                Voice note
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {item.timestamp && typeof item.timestamp.toDate === "function"
                ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                    addSuffix: true,
                  })
                : translations.sending}
            </Text>
          </View>
        </LinearGradient>
      );
    }
    return (
      <LinearGradient
        colors={
          item.sender === currentUser.uid
            ? ["#4c669f", "#3b5998"]
            : ["#e0e0e0", "#cfcfcf"]
        }
        style={[
          styles.messageBubble,
          {
            alignSelf:
              item.sender === currentUser.uid ? "flex-end" : "flex-start",
          },
        ]}
      >
        <Text
          style={{
            color: item.sender === currentUser.uid ? "white" : "black",
          }}
        >
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
          {item.timestamp && typeof item.timestamp.toDate === "function"
            ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                addSuffix: true,
              })
            : translations.sending}
        </Text>
      </LinearGradient>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: colors.background, flex: 1 },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top + 8 : 0
        }
      >
        <View style={[styles.header, { marginTop: 35 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: user.profilePic || placeholderAvatar }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerTitle}>{user.displayName}</Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {translations.startConversation}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{
              padding: 10,
              paddingBottom: 16 + Math.max(insets.bottom, 8) + 56,
            }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <Text style={styles.uploadProgressText}>
              {Math.floor(uploadProgress)}%
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity onPress={sendImage} style={styles.attachmentButton}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickDocuments}
            style={styles.attachmentButton}
          >
            <Ionicons name="attach-outline" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TextInput
            placeholder={translations.typeMessage}
            value={messageText}
            onChangeText={setMessageText}
            style={[
              styles.input,
              {
                borderColor: colors.error,
                color: colors.error,
              },
            ]}
            placeholderTextColor={colors.error}
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 15,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    marginLeft: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    maxWidth: "70%",
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  imageMessage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },
  imageActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  attachmentButton: {
    marginHorizontal: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  sendButton: {
    marginLeft: 10,
  },
  uploadingOverlay: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  uploadProgressText: {
    marginTop: 8,
    fontSize: 16,
    color: "#007AFF",
  },
  storyPreviewContainer: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  storyPreviewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  storyPreviewCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    color: "white",
  },
});
