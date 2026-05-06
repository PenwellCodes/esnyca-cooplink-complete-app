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
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight";
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
        style={[styles.headerAvatar, { width: size, height: size, borderRadius: size / 2 }]}
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
  const user = params.user ? JSON.parse(params.user) : null;
  const predefinedMessage = params.predefinedMessage;
  const { currentUser } = useAuth();
  const { 
    conversations, 
    markMessagesAsRead, 
    setActiveChatId, 
    sendMessage: sendChatMessage,
    refreshChats  // Add this
  } = useChat();
  const { setUserInChat } = useNotifications();
  const currentUserUid = currentUser?.uid || null;
  const targetUserUid = user?.uid || null;
  const chatId = buildDirectKey(currentUserUid, targetUserUid);

  // State for text messages and local messages
  const [messageText, setMessageText] = useState(predefinedMessage || "");
  const [localMessages, setLocalMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);

  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [pendingStoryReply, setPendingStoryReply] = useState(() =>
    parseStoryPreviewParam(params.storyPreview)
  );

  const contextMessages = chatId ? conversations[chatId] || [] : [];
  const contextMessageIds = new Set(contextMessages.map((m) => String(m.id)));
  const dedupedLocalMessages = localMessages.filter(
    (m) => !contextMessageIds.has(String(m.id))
  );
  const messages = [...contextMessages, ...dedupedLocalMessages];
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { currentLanguage, t } = useLanguage();

  const kbOffset = keyboardHeight;
  const inputBarReserve =
    56 +
    Math.max(insets.bottom, 8) +
    (Platform.OS === "android" ? keyboardHeight : kbOffset);

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

  // Track when user enters/exits chat for notifications
  useEffect(() => {
    setUserInChat(true, targetUserUid);
    return () => {
      setUserInChat(false);
    };
  }, [targetUserUid, setUserInChat]);

  // ============================================
  // NEW: Mark messages as read when viewing the chat
  // ============================================
  useEffect(() => {
    const markCurrentChatAsRead = async () => {
      if (!chatId || !currentUserUid) return;
      
      const chatMessages = conversations[chatId] || [];
      const unreadMessages = chatMessages.filter(msg => {
        const isReceiver = normalizeId(msg.receiver) === normalizeId(currentUserUid);
        const isNotRead = !msg.read && msg.status !== 'read';
        const isNotFromCurrentUser = normalizeId(msg.sender) !== normalizeId(currentUserUid);
        return isReceiver && isNotRead && isNotFromCurrentUser;
      });
      
      if (unreadMessages.length > 0) {
        await markMessagesAsRead(chatId, chatMessages);
        // Force refresh to update badge count
        if (refreshChats) {
          await refreshChats();
        }
      }
    };
    
    markCurrentChatAsRead();
  }, [chatId, currentUserUid, conversations, markMessagesAsRead, refreshChats]);

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
    if (!chatId) return;
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
    if (keyboardHeight <= 0) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [keyboardHeight]);

  const handleSendMessage = async () => {
    if (!chatId || !currentUserUid || !targetUserUid) return;
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
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const created = await sendChatMessage({
        chatKey: chatId,
        receiverUserId: targetUserUid,
        text: messageText,
        type: storyPreview ? "story_reply" : "text",
        storyPreview,
      });
      setMessageText("");
      setPendingStoryReply(null);
      if (created?.Id || created?.id) {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: created.Id || created.id,
                  _chatId: created.ChatId || created.chatId,
                  timestamp: created.CreatedAt
                    ? { toDate: () => new Date(created.CreatedAt) }
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
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
      Alert.alert(
        translations.error,
        error?.message || "Failed to send message. Please try again."
      );
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
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await sendDocument(file);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert(translations.error, translations.failedPickDocument);
    }
  };

  const sendDocument = async (file) => {
    if (!chatId || !currentUserUid || !targetUserUid) return;
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
    flatListRef.current?.scrollToEnd({ animated: true });
    setUploading(true);

    try {
      const downloadURL = await uploadFile(file.uri, file.name);
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
                  _chatId: created.ChatId || created.chatId,
                  fileUrl: created.FileUrl || m.fileUrl,
                  fileName: created.FileName || m.fileName,
                  timestamp: created.CreatedAt
                    ? { toDate: () => new Date(created.CreatedAt) }
                    : m.timestamp,
                  status: "sent",
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error sending document:", error);
      Alert.alert(translations.error, translations.failedSendDocument);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sendImage = async () => {
    if (!chatId || !currentUserUid || !targetUserUid) return;
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
    flatListRef.current?.scrollToEnd({ animated: true });
    setUploading(true);

    try {
      const fileName = uri.split("/").pop();
      const downloadURL = await uploadFile(uri, fileName);
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
                  _chatId: created.ChatId || created.chatId,
                  fileUrl: created.FileUrl || m.fileUrl,
                  fileName: created.FileName || m.fileName,
                  timestamp: created.CreatedAt
                    ? { toDate: () => new Date(created.CreatedAt) }
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

  if (!currentUserUid || !targetUserUid || !chatId) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#007AFF" />
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, flex: 1 },
        ]}
      >
        {/* FIXED HEADER - with proper name truncation and initials */}
        <View style={[styles.header, { marginTop: insets.top || 35, paddingTop: 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
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
                ellipsizeMode="tail"
              >
                {truncateName(user?.displayName, 18)}
              </Text>
              {user?.role === "cooperative" && (
                <Text style={styles.headerRole} numberOfLines={1}>
                  Cooperative
                </Text>
              )}
            </View>
          </View>
        </View>

        {messages.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { paddingBottom: inputBarReserve },
            ]}
          >
            <Text style={styles.emptyText}>
              {translations.startConversation}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{
              padding: 10,
              paddingBottom: 16 + inputBarReserve,
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

        <View
          style={[
            styles.inputContainer,
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: kbOffset,
              paddingBottom: Math.max(insets.bottom, 8),
              backgroundColor: colors.background,
            },
          ]}
        >
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
                borderColor: colors.outline,
                color: colors.onSurface,
              },
            ]}
            placeholderTextColor={colors.onSurfaceVariant}
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {pendingStoryReply && (
          <View style={[styles.pendingStoryReply, { bottom: kbOffset + 64 }]}>
            <View style={styles.pendingStoryReplyLeft}>
              {pendingStoryReply.imageURL ? (
                <Image
                  source={{ uri: pendingStoryReply.imageURL }}
                  style={styles.pendingStoryReplyImage}
                />
              ) : null}
              <View style={styles.pendingStoryReplyTextWrap}>
                <Text style={styles.pendingStoryReplyTitle}>
                  Replying to this status
                </Text>
                {!!pendingStoryReply.caption && (
                  <Text style={styles.pendingStoryReplyCaption} numberOfLines={1}>
                    {pendingStoryReply.caption}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => setPendingStoryReply(null)}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingVertical: 12,
    minHeight: 60,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    justifyContent: "center",
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
  pendingStoryReply: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    padding: 8,
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