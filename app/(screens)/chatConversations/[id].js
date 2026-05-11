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
  Keyboard,
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
import { useNotifications } from "../../../context/appstate/NotificationsContext";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

// Helper function to truncate long names
const truncateName = (name, maxLength = 18) => {
  if (!name) return "Chat";
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength)}...`;
};

// Helper function to get user initials
const getUserInitials = (displayName) => {
  if (!displayName) return "?";
  const nameParts = displayName.split(" ");
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
};

// Avatar component with initials fallback
const HeaderAvatar = ({ imageUrl, name, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getUserInitials(name);

  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.headerAvatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.headerInitialsAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#007AFF",
        },
      ]}
    >
      <Text style={[styles.headerInitialsText, { fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
};

const normalizeId = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const buildDirectKey = (a, b) => {
  const aa = normalizeId(a);
  const bb = normalizeId(b);
  if (!aa || !bb) return null;
  return aa > bb ? `${aa}_${bb}` : `${bb}_${aa}`;
};

const parseStoryPreviewParam = (rawValue) => {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const ChatScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const userId = params.userId || params.id;
  const predefinedMessage = params.predefinedMessage;

  const { currentUser } = useAuth();
  const { userMap } = useChat();

  const user = userMap ? userMap[normalizeId(userId)] : null;

  const {
    conversations,
    markMessagesAsRead,
    setActiveChatId,
    sendMessage: sendChatMessage,
    refreshChats,
    forceRefreshUnreadCounts,
  } = useChat();

  const { setUserInChat } = useNotifications();

  const currentUserUid = currentUser?.uid || null;
  const targetUserUid = user?.uid || userId;
  const chatId = buildDirectKey(currentUserUid, targetUserUid);

  const [messageText, setMessageText] = useState(
    predefinedMessage || ""
  );

  const [localMessages, setLocalMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const flatListRef = useRef(null);

  const [selectedDocuments, setSelectedDocuments] = useState([]);

  const [pendingStoryReply, setPendingStoryReply] = useState(() =>
    parseStoryPreviewParam(params.storyPreview)
  );

  const contextMessages = chatId
    ? conversations[chatId] || []
    : [];

  const contextMessageIds = new Set(
    contextMessages.map((m) => String(m.id))
  );

  const dedupedLocalMessages = localMessages.filter(
    (m) => !contextMessageIds.has(String(m.id))
  );

  const messages = [...contextMessages, ...dedupedLocalMessages];

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

  // Notifications
  useEffect(() => {
    setUserInChat(true, targetUserUid);

    return () => {
      setUserInChat(false);
    };
  }, [targetUserUid, setUserInChat]);

  // Mark messages as read
  useEffect(() => {
    const markCurrentChatAsRead = async () => {
      if (!chatId || !currentUserUid) return;

      const chatMessages = conversations[chatId] || [];

      const unreadMessages = chatMessages.filter((msg) => {
        const isReceiver =
          normalizeId(msg.receiver) ===
          normalizeId(currentUserUid);

        const isNotRead =
          !msg.read && msg.status !== "read";

        const isNotFromCurrentUser =
          normalizeId(msg.sender) !==
          normalizeId(currentUserUid);

        return (
          isReceiver &&
          isNotRead &&
          isNotFromCurrentUser
        );
      });

      if (unreadMessages.length > 0) {
        await markMessagesAsRead(chatId, chatMessages);

        if (refreshChats) {
          await refreshChats();
        }

        if (forceRefreshUnreadCounts) {
          await forceRefreshUnreadCounts();
        }
      }
    };

    markCurrentChatAsRead();
  }, [
    chatId,
    currentUserUid,
    conversations,
    markMessagesAsRead,
    refreshChats,
    forceRefreshUnreadCounts,
  ]);

  // Translations
  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        permissionRequiredTitle: await t(
          "Permission Required"
        ),
        permissionRequiredBody: await t(
          "Sorry, we need media library permissions to make this work!"
        ),
        startConversation: await t(
          "Start a conversation"
        ),
        typeMessage: await t("Type a message..."),
        download: await t("Download"),
        sending: await t("Sending..."),
        error: await t("Error"),
        failedPickDocument: await t(
          "Failed to pick document"
        ),
        failedSendDocument: await t(
          "Failed to send document"
        ),
      });
    };

    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    if (!chatId) return;

    setActiveChatId(chatId);

    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  // Permissions
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

  // Auto scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!chatId || !currentUserUid || !targetUserUid)
      return;

    if (!messageText.trim()) return;

    const storyPreview = pendingStoryReply;

    const tempId = Date.now().toString();

    const tempMessage = {
      id: tempId,
      sender: currentUserUid,
      receiver: targetUserUid,
      text: messageText,
      type: storyPreview ? "story_reply" : "text",
      storyPreview,
      timestamp: new Date(),
      status: "sending",
    };

    setLocalMessages((prev) => [...prev, tempMessage]);

    const currentText = messageText;

    setMessageText("");

    scrollToBottom();

    try {
      const created = await sendChatMessage({
        chatKey: chatId,
        receiverUserId: targetUserUid,
        text: currentText,
        type: storyPreview ? "story_reply" : "text",
        storyPreview,
      });

      setPendingStoryReply(null);

      if (created?.Id || created?.id) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: created.Id || created.id,
                  _chatId:
                    created.ChatId || created.chatId,
                  timestamp: created.CreatedAt
                    ? {
                        toDate: () =>
                          new Date(created.CreatedAt),
                      }
                    : m.timestamp,
                  status: "sent",
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: "failed" }
            : m
        )
      );

      Alert.alert(
        translations.error,
        error?.message ||
          "Failed to send message. Please try again."
      );
    }
  };

  const uploadFile = async (
    uri,
    fileName = `file-${Date.now()}.jpg`
  ) => {
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
    let result =
      await ImagePicker.launchImageLibraryAsync({
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
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "*/*",
          copyToCacheDirectory: true,
        });

      if (
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];
        await sendDocument(file);
      }
    } catch (error) {
      console.error("Error picking document:", error);

      Alert.alert(
        translations.error,
        translations.failedPickDocument
      );
    }
  };

  const sendDocument = async (file) => {
    if (!chatId || !currentUserUid || !targetUserUid)
      return;

    if (!file) return;

    const tempId = Date.now().toString();

    const tempMessage = {
      id: tempId,
      sender: currentUserUid,
      receiver: targetUserUid,
      fileUrl: file.uri,
      fileName: file.name,
      type: "file",
      timestamp: new Date(),
      status: "uploading",
    };

    setLocalMessages((prev) => [...prev, tempMessage]);

    scrollToBottom();

    setUploading(true);

    try {
      const downloadURL = await uploadFile(
        file.uri,
        file.name
      );

      const created = await sendChatMessage({
        chatKey: chatId,
        receiverUserId: targetUserUid,
        type: "file",
        fileUrl: downloadURL,
        fileName: file.name,
      });

      if (created?.Id || created?.id) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: created.Id || created.id,
                  _chatId:
                    created.ChatId || created.chatId,
                  fileUrl:
                    created.FileUrl || m.fileUrl,
                  fileName:
                    created.FileName || m.fileName,
                  timestamp: created.CreatedAt
                    ? {
                        toDate: () =>
                          new Date(created.CreatedAt),
                      }
                    : m.timestamp,
                  status: "sent",
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error(
        "Error sending document:",
        error
      );

      Alert.alert(
        translations.error,
        translations.failedSendDocument
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sendImage = async () => {
    if (!chatId || !currentUserUid || !targetUserUid)
      return;

    const uri = await pickImage();

    if (!uri) return;

    const tempId = Date.now().toString();

    const tempMessage = {
      id: tempId,
      sender: currentUserUid,
      receiver: targetUserUid,
      fileUrl: uri,
      type: "image",
      timestamp: new Date(),
      status: "uploading",
    };

    setLocalMessages((prev) => [...prev, tempMessage]);

    scrollToBottom();

    setUploading(true);

    try {
      const fileName = uri.split("/").pop();

      const downloadURL = await uploadFile(
        uri,
        fileName
      );

      const created = await sendChatMessage({
        chatKey: chatId,
        receiverUserId: targetUserUid,
        type: "image",
        fileUrl: downloadURL,
        fileName,
      });

      if (created?.Id || created?.id) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: created.Id || created.id,
                  _chatId:
                    created.ChatId || created.chatId,
                  fileUrl:
                    created.FileUrl || m.fileUrl,
                  fileName:
                    created.FileName || m.fileName,
                  timestamp: created.CreatedAt
                    ? {
                        toDate: () =>
                          new Date(created.CreatedAt),
                      }
                    : m.timestamp,
                  status: "sent",
                }
              : m
          )
        );
      }

      setSelectedImage(null);
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const renderMessage = ({ item }) => {
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
              item.sender === currentUser.uid
                ? "flex-end"
                : "flex-start",
          },
        ]}
      >
        {item.type === "image" && (
          <TouchableOpacity
            onPress={() =>
              item.fileUrl &&
              Linking.openURL(item.fileUrl)
            }
          >
            <Image
              source={{ uri: item.fileUrl }}
              style={styles.imageMessage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {item.type === "file" && (
          <View style={styles.fileRow}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={
                item.sender === currentUser.uid
                  ? "white"
                  : "black"
              }
            />

            <TouchableOpacity
              onPress={() =>
                item.fileUrl &&
                Linking.openURL(item.fileUrl)
              }
            >
              <Text
                style={{
                  color:
                    item.sender === currentUser.uid
                      ? "white"
                      : "black",
                  marginLeft: 8,
                  fontWeight: "bold",
                }}
              >
                {item.fileName}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {item.type !== "image" &&
          item.type !== "file" && (
            <Text
              style={{
                color:
                  item.sender === currentUser.uid
                    ? "white"
                    : "black",
              }}
            >
              {item.text}
            </Text>
          )}

        <Text style={styles.timestamp}>
          {item.timestamp &&
          typeof item.timestamp.toDate ===
            "function"
            ? formatDistanceToNow(
                new Date(item.timestamp.toDate()),
                {
                  addSuffix: true,
                }
              )
            : translations.sending}
        </Text>
      </LinearGradient>
    );
  };

  if (
    !currentUserUid ||
    !targetUserUid ||
    !chatId
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text
          style={{
            color: "red",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          Unable to load chat. Please go back and try
          again.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text
            style={{
              color: "#007AFF",
              fontSize: 16,
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          { backgroundColor: colors.background },
        ]}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios"
            ? insets.top + 20
            : Math.max(insets.bottom, 10)
        }
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === "android"
                  ? insets.top + 10
                  : insets.top,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <HeaderAvatar
              imageUrl={user?.profilePic}
              name={user?.displayName}
              size={40}
            />

            <View style={styles.headerTextContainer}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
              >
                {truncateName(
                  user?.displayName,
                  18
                )}
              </Text>

              {user?.role === "cooperative" && (
                <Text
                  style={styles.headerRole}
                >
                  Cooperative
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingVertical: 10,
            paddingBottom: 120 + Math.max(insets.bottom, 10), // Extra space for input container
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />

        {/* Story Reply Preview */}
        {pendingStoryReply && (
          <View style={styles.pendingStoryReply}>
            <View
              style={
                styles.pendingStoryReplyLeft
              }
            >
              {pendingStoryReply.imageURL ? (
                <Image
                  source={{
                    uri: pendingStoryReply.imageURL,
                  }}
                  style={
                    styles.pendingStoryReplyImage
                  }
                />
              ) : null}

              <View
                style={
                  styles.pendingStoryReplyTextWrap
                }
              >
                <Text
                  style={
                    styles.pendingStoryReplyTitle
                  }
                >
                  Replying to this status
                </Text>

                {!!pendingStoryReply.caption && (
                  <Text
                    style={
                      styles
                        .pendingStoryReplyCaption
                    }
                    numberOfLines={1}
                  >
                    {pendingStoryReply.caption}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                setPendingStoryReply(null)
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              position: "absolute",
              bottom: Math.max(insets.bottom, 10),
              left: 0,
              right: 0,
              paddingBottom: Platform.OS === "ios" ? 10 : 14,
            },
          ]}
        >
          <TouchableOpacity
            onPress={sendImage}
            style={styles.attachmentButton}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickDocuments}
            style={styles.attachmentButton}
          >
            <Ionicons
              name="attach-outline"
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>

          <TextInput
            placeholder={translations.typeMessage}
            value={messageText}
            onChangeText={setMessageText}
            style={[
              styles.input,
              {
                borderColor: colors.outline,
                color: colors.onSurface,
                backgroundColor:
                  colors.surface,
              },
            ]}
            placeholderTextColor={
              colors.onSurfaceVariant
            }
            multiline
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            style={styles.sendButton}
          >
            <Ionicons
              name="send"
              size={24}
              color="#007AFF"
            />
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
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingBottom: 12,
    elevation: 4,
  },

  backButton: {
    padding: 8,
    marginRight: 8,
  },

  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  headerAvatar: {
    marginRight: 12,
    borderWidth: 2,
    borderColor: "white",
  },

  headerInitialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "white",
  },

  headerInitialsText: {
    color: "white",
    fontWeight: "bold",
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  headerRole: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },

  messageBubble: {
    padding: 10,
    borderRadius: 15,
    maxWidth: "75%",
    marginVertical: 5,
    elevation: 2,
  },

  timestamp: {
    fontSize: 10,
    color: "#ddd",
    marginTop: 5,
  },

  imageMessage: {
    width: 220,
    height: 180,
    borderRadius: 10,
    marginBottom: 5,
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  attachmentButton: {
    marginBottom: 10,
    marginRight: 8,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 45,
    maxHeight: 100,
  },

  sendButton: {
    marginLeft: 8,
    marginBottom: 10,
  },

  pendingStoryReply: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    padding: 8,
    marginHorizontal: 10,
    marginBottom: 5,
  },

  pendingStoryReplyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  pendingStoryReplyImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 8,
  },

  pendingStoryReplyTextWrap: {
    flex: 1,
  },

  pendingStoryReplyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
  },

  pendingStoryReplyCaption: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
});