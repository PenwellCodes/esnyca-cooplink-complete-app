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
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../../context/appstate/LanguageContext";
import { apiRequest } from "../../../utils/api";
import { useNotifications } from "../../../context/appstate/NotificationsContext";
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight"; // ✅ use the hook

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const truncateName = (name, maxLength = 18) => {
  if (!name) return "Chat";
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength)}...`;
};

const getUserInitials = (displayName) => {
  if (!displayName) return "?";
  const nameParts = displayName.split(" ");
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
};

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

const getValidDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate && typeof timestamp.toDate === "function") return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
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
    deleteMessage = () => {},
  } = useChat();
  const { setUserInChat } = useNotifications();
  const currentUserUid = currentUser?.uid || null;
  const targetUserUid = user?.uid || userId;
  const chatId = buildDirectKey(currentUserUid, targetUserUid);

  const [messageText, setMessageText] = useState(predefinedMessage || "");
  const [localMessages, setLocalMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
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
  const { currentLanguage, t } = useLanguage();
  const keyboardHeight = useKeyboardHeight(); // ✅ real keyboard height

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
    deleteMessage: "Delete message",
    deleteConfirmation: "Delete this message?",
    deleteForMe: "Delete for me",
    cancel: "Cancel",
  });

  // Keyboard scroll: delayed + retry
  useEffect(() => {
    const onKeyboardShow = () => {
      setTimeout(() => {
        scrollToBottom(true);
        // second retry after 400ms (keyboard fully settled)
        setTimeout(() => scrollToBottom(true), 400);
      }, 400);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const listener = Keyboard.addListener(showEvent, onKeyboardShow);
    return () => listener.remove();
  }, []);

  // Track when user enters/exits chat
  useEffect(() => {
    setUserInChat(true, targetUserUid);
    return () => setUserInChat(false);
  }, [targetUserUid, setUserInChat]);

  // Mark messages as read
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
        if (refreshChats) await refreshChats();
        if (forceRefreshUnreadCounts) await forceRefreshUnreadCounts();
      }
    };
    markCurrentChatAsRead();
  }, [chatId, currentUserUid, conversations, markMessagesAsRead, refreshChats, forceRefreshUnreadCounts]);

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        permissionRequiredTitle: await t("Permission Required"),
        permissionRequiredBody: await t("Sorry, we need media library permissions to make this work!"),
        startConversation: await t("Start a conversation"),
        typeMessage: await t("Type a message..."),
        download: await t("Download"),
        sending: await t("Sending..."),
        error: await t("Error"),
        failedPickDocument: await t("Failed to pick document"),
        failedSendDocument: await t("Failed to send document"),
        deleteMessage: await t("Delete message"),
        deleteConfirmation: await t("Delete this message?"),
        deleteForMe: await t("Delete for me"),
        cancel: await t("Cancel"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    if (!chatId) return;
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  // Request permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(translations.permissionRequiredTitle, translations.permissionRequiredBody);
      }
    })();
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length]);

  const scrollToBottom = (animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 400);
  };

  const getItemLayout = (data, index) => ({
    length: 70, // approximate height of a message bubble
    offset: 70 * index,
    index,
  });

  const handleDeleteMessage = (message) => {
    if (message.sender !== currentUserUid) return;
    Alert.alert(
      translations.deleteMessage,
      translations.deleteConfirmation,
      [
        { text: translations.cancel, style: "cancel" },
        {
          text: translations.deleteForMe,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessage(chatId, message.id);
              setLocalMessages((prev) => prev.filter((m) => m.id !== message.id));
              if (refreshChats) await refreshChats();
            } catch (error) {
              console.error("Error deleting message:", error);
              Alert.alert(translations.error, "Failed to delete message");
            }
          },
        },
      ]
    );
  };

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
    setMessageText("");
    scrollToBottom(true);

    try {
      const created = await sendChatMessage({
        chatKey: chatId,
        receiverUserId: targetUserUid,
        text: messageText,
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
      Alert.alert(translations.error, error?.message || "Failed to send message.");
    }
  };

  const uploadFile = async (uri, fileName = `file-${Date.now()}.jpg`) => {
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: fileName,
      type: "image/jpeg",
    });
    const uploadResult = await apiRequest("/upload", { method: "POST", body: formData });
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
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        await sendDocument(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert(translations.error, translations.failedPickDocument);
    }
  };

  const sendDocument = async (file) => {
    if (!chatId || !currentUserUid || !targetUserUid) return;
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
    setUploading(true);
    scrollToBottom(true);
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
                  timestamp: created.CreatedAt ? { toDate: () => new Date(created.CreatedAt) } : m.timestamp,
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
    setUploading(true);
    scrollToBottom(true);
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
                  timestamp: created.CreatedAt ? { toDate: () => new Date(created.CreatedAt) } : m.timestamp,
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
    const isOwnMessage = item.sender === currentUserUid;
    const bubbleColor = isOwnMessage ? "#4c669f" : "#e0e0e0";
    const textColor = isOwnMessage ? "white" : "black";

    const MessageContent = (
      <View style={[styles.messageBubble, { alignSelf: isOwnMessage ? "flex-end" : "flex-start", backgroundColor: bubbleColor }]}>
        {item.type === "story_reply" && (
          <>
            {item.storyPreview?.imageURL && (
              <View style={styles.storyPreviewContainer}>
                <Image source={{ uri: item.storyPreview.imageURL }} style={styles.storyPreviewImage} />
                {item.storyPreview.caption && <Text style={styles.storyPreviewCaption}>{item.storyPreview.caption}</Text>}
              </View>
            )}
            <Text style={{ color: textColor }}>{item.text}</Text>
          </>
        )}
        {item.type === "image" && (
          <>
            <TouchableOpacity onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)} activeOpacity={0.8}>
              <Image source={{ uri: item.fileUrl }} style={styles.imageMessage} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.imageActions}>
              {item.status === "uploading" ? (
                <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#666"} style={{ marginRight: 5 }} />
              ) : (
                <TouchableOpacity onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)} style={styles.downloadButton}>
                  <Ionicons name="download-outline" size={16} color={isOwnMessage ? "#cce6ff" : "#007AFF"} />
                  <Text style={{ color: isOwnMessage ? "#cce6ff" : "#007AFF", marginLeft: 5, fontSize: 12 }}>{translations.download}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        {item.type === "file" && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="document-text-outline" size={24} color={isOwnMessage ? "white" : "black"} />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: isOwnMessage ? "white" : "black", fontWeight: "bold" }}>{item.fileName}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
                <Text style={{ color: isOwnMessage ? "#cce6ff" : "#007AFF" }}>{translations.download}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {item.type === "audio" && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="musical-notes-outline" size={24} color={isOwnMessage ? "white" : "black"} />
            <View style={{ marginLeft: 8 }}>
              <TouchableOpacity onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}>
                <Text style={{ color: isOwnMessage ? "#cce6ff" : "#007AFF", fontWeight: "bold" }}>Voice note</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {item.type === "text" && !item.storyPreview && <Text style={{ color: textColor }}>{item.text}</Text>}
        <Text style={styles.timestamp}>
          {(() => {
            const date = getValidDate(item.timestamp);
            return date ? formatDistanceToNow(date, { addSuffix: true }) : translations.sending;
          })()}
        </Text>
      </View>
    );

    if (isOwnMessage) {
      return (
        <TouchableOpacity activeOpacity={0.7} onLongPress={() => handleDeleteMessage(item)} delayLongPress={300}>
          {MessageContent}
        </TouchableOpacity>
      );
    }
    return MessageContent;
  };

  if (!currentUserUid || !targetUserUid || !chatId) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>Unable to load chat. Please go back and try again.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerHeight = 60;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight + insets.top : 0;
  const bottomPadding = keyboardHeight > 0 ? keyboardHeight + 10 : Math.max(insets.bottom, 10);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={[styles.header, { paddingTop: insets.top || 35 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <HeaderAvatar imageUrl={user?.profilePic} name={user?.displayName} size={40} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {truncateName(user?.displayName, 18)}
              </Text>
              {user?.role === "cooperative" && <Text style={styles.headerRole} numberOfLines={1}>Cooperative</Text>}
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onLayout={() => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false }); }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          getItemLayout={getItemLayout}
        />

        {pendingStoryReply && (
          <View style={styles.pendingStoryReply}>
            <View style={styles.pendingStoryReplyLeft}>
              {pendingStoryReply.imageURL && <Image source={{ uri: pendingStoryReply.imageURL }} style={styles.pendingStoryReplyImage} />}
              <View style={styles.pendingStoryReplyTextWrap}>
                <Text style={styles.pendingStoryReplyTitle}>Replying to this status</Text>
                {!!pendingStoryReply.caption && <Text style={styles.pendingStoryReplyCaption} numberOfLines={1}>{pendingStoryReply.caption}</Text>}
              </View>
            </View>
            <TouchableOpacity onPress={() => setPendingStoryReply(null)}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
          <TouchableOpacity onPress={sendImage} style={styles.attachmentButton}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickDocuments} style={styles.attachmentButton}>
            <Ionicons name="attach-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            placeholder={translations.typeMessage}
            value={messageText}
            onChangeText={setMessageText}
            onFocus={handleInputFocus}
            style={[styles.input, { borderColor: colors.outline, color: colors.onSurface, backgroundColor: colors.surface }]}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
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
  container: { flex: 1 },
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
  backButton: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: "white" },
  headerInitialsAvatar: { justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 2, borderColor: "white" },
  headerInitialsText: { color: "white", fontWeight: "bold" },
  headerTextContainer: { flex: 1, justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 16, fontWeight: "bold" },
  headerRole: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  messagesList: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 20, flexGrow: 1 },
  messageBubble: { padding: 10, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3, maxWidth: "70%", marginVertical: 5 },
  timestamp: { fontSize: 10, color: "#666", marginTop: 4 },
  imageMessage: { width: 200, height: 150, borderRadius: 10, marginBottom: 5 },
  imageActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  downloadButton: { flexDirection: "row", alignItems: "center" },
  inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  attachmentButton: { marginRight: 10, padding: 5 },
  input: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 20, fontSize: 16, maxHeight: 100 },
  sendButton: { marginLeft: 10, padding: 5 },
  storyPreviewContainer: { marginBottom: 8, borderRadius: 8, overflow: "hidden" },
  storyPreviewImage: { width: 200, height: 150, borderRadius: 8 },
  storyPreviewCaption: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", padding: 8, color: "white" },
  pendingStoryReply: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "#d9d9d9", padding: 8, marginHorizontal: 10, marginBottom: 5 },
  pendingStoryReplyLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  pendingStoryReplyImage: { width: 44, height: 44, borderRadius: 6, marginRight: 8 },
  pendingStoryReplyTextWrap: { flex: 1 },
  pendingStoryReplyTitle: { fontSize: 12, fontWeight: "700", color: "#222" },
  pendingStoryReplyCaption: { marginTop: 2, fontSize: 12, color: "#666" },
});