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
import { TouchableOpacity as GHChatTouchable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../../context/appstate/ChatContext";
import { useAuth } from "../../context/appstate/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";
import { useTheme } from "react-native-paper";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const getUserInitials = (displayName) => {
  if (!displayName) return "?";
  const nameParts = displayName.split(" ");
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
};

const AvatarWithInitials = ({ imageUrl, name, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getUserInitials(name);

  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "bold", fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );
};

const colorGradients = [
  ["#8A2BE2", "#9370DB"],
  ["#FF4500", "#FF6347"],
  ["#32CD32", "#3CB371"],
  ["#1E90FF", "#00BFFF"],
  ["#FF1493", "#FF69B4"],
];

const getGradientForUser = (uid = "user") => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return colorGradients[Math.abs(hash) % colorGradients.length];
};

const normalizeId = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const MESSAGE_ID_GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isPersistedMessageId = (id) =>
  id != null && MESSAGE_ID_GUID_RE.test(String(id));

const ChatScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const group = params.group ? JSON.parse(params.group) : null;
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?.uid;
  const { 
    conversations, 
    markMessagesAsRead, 
    setActiveChatId, 
    userMap, 
    sendMessage, 
    refreshChats,
    deleteMessage,
    hideMessageForMe,
    filterMessagesForChat,
  } = useChat();
  const chatId = group?.uid || "group_swazi_cooperators";
  const headerTitle = group?.displayName || "Group";
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  const [allUsers, setAllUsers] = useState({});
  const { currentLanguage, t } = useLanguage();

  const [translations, setTranslations] = useState({
    startConversation: "Start a conversation",
    typeMessage: "Type a message...",
    download: "Download",
    sending: "Sending...",
    deleteMessage: "Delete message",
    removeForMe: "Remove for me",
    deleteForEveryone: "Delete for everyone",
    deleteForEveryoneHint:
      "Permanently removes this message for all participants.",
    removeForMeHint: "Hides this message on your device only.",
    cancel: "Cancel",
    error: "Error",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        startConversation: await t("Start a conversation"),
        typeMessage: await t("Type a message..."),
        download: await t("Download"),
        sending: await t("Sending..."),
        deleteMessage: await t("Delete message"),
        removeForMe: await t("Remove for me"),
        deleteForEveryone: await t("Delete for everyone"),
        deleteForEveryoneHint: await t(
          "Permanently removes this message for all participants."
        ),
        removeForMeHint: await t("Hides this message on your device only."),
        cancel: await t("Cancel"),
        error: await t("Error"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Fetch all users as fallback for userMap
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const users = await apiRequest("/users");
        const userDict = {};
        (users || []).forEach(user => {
          const userId = user.Id || user.id || user.uid;
          if (userId) {
            userDict[userId] = {
              displayName: user.DisplayName || user.displayName || user.name || "User",
              profilePic: user.ProfilePicUrl || user.profilePicUrl || user.profilePic || "",
            };
          }
        });
        setAllUsers(userDict);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchAllUsers();
  }, []);

  const rawContext = conversations?.[chatId] || [];
  const contextMessageIds = new Set(rawContext.map((m) => String(m.id)));
  const dedupedLocal = localMessages.filter(
    (m) => !contextMessageIds.has(String(m.id))
  );
  const messages = filterMessagesForChat(chatId, [
    ...rawContext,
    ...dedupedLocal,
  ]);

  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      markMessagesAsRead(chatId, messages);
    }
  }, [messages, chatId]);

  // Scroll to bottom when messages change (new message added)
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (keyboardHeight > 0 && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [keyboardHeight, messages.length]);

  const uploadFile = async (uri, fileName = `file-${Date.now()}.jpg`) => {
    const formData = new FormData();
    formData.append("image", { uri, name: fileName, type: "image/jpeg" });
    const uploadResult = await apiRequest("/upload", { method: "POST", body: formData });
    return uploadResult?.imageUrl;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const tempId = Date.now().toString();
    const temp = {
      id: tempId,
      sender: currentUserId,
      text: messageText,
      type: "text",
      timestamp: new Date(),
      status: "sending",
    };
    setLocalMessages((p) => [...p, temp]);
    setMessageText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      await sendMessage({ chatKey: chatId, type: "text", text: messageText });
      setLocalMessages((p) => p.filter((m) => m.id !== temp.id));
      if (refreshChats) await refreshChats();
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", error?.message || "Failed to send message");
      setLocalMessages((p) => p.filter((m) => m.id !== temp.id));
    }
  };

  const sendImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setSelectedImage(uri);
    setUploading(true);
    
    const tempId = Date.now().toString();
    const temp = {
      id: tempId,
      sender: currentUserId,
      fileUrl: uri,
      type: "image",
      timestamp: new Date(),
      status: "sending",
    };
    setLocalMessages((p) => [...p, temp]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    
    try {
      const fileName = uri.split("/").pop();
      const downloadURL = await uploadFile(uri, fileName);
      await sendMessage({ chatKey: chatId, type: "image", fileUrl: downloadURL, fileName });
      setSelectedImage(null);
      setLocalMessages((p) => p.filter((m) => m.id !== temp.id));
      if (refreshChats) await refreshChats();
    } catch (error) {
      console.error("Error sending image:", error);
      Alert.alert("Error", error?.message || "Failed to send image");
      setLocalMessages((p) => p.filter((m) => m.id !== temp.id));
    } finally {
      setUploading(false);
    }
  };

  const removeFromLocalUi = async (message) => {
    await hideMessageForMe(chatId, message.id);
    setLocalMessages((prev) =>
      prev.filter((m) => String(m.id) !== String(message.id))
    );
  };

  const handleDeleteMessage = (message) => {
    const mine = normalizeId(message.sender) === normalizeId(currentUserId);
    const canDeleteForEveryone = mine && isPersistedMessageId(message.id);

    const buttons = [
      {
        text: translations.removeForMe,
        onPress: () => {
          removeFromLocalUi(message).catch((e) =>
            console.error("Remove for me:", e)
          );
        },
      },
    ];

    if (canDeleteForEveryone) {
      buttons.push({
        text: translations.deleteForEveryone,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage(chatId, message.id, message);
            setLocalMessages((prev) =>
              prev.filter((m) => String(m.id) !== String(message.id))
            );
          } catch (error) {
            if (error?.localOnly) {
              setLocalMessages((prev) =>
                prev.filter((m) => String(m.id) !== String(message.id))
              );
              return;
            }
            console.error("Error deleting message:", error);
            Alert.alert(
              translations.error,
              error?.message || "Failed to delete message"
            );
          }
        },
      });
    }

    buttons.push({ text: translations.cancel, style: "cancel" });

    const hint = canDeleteForEveryone
      ? `${translations.removeForMeHint}\n\n${translations.deleteForEveryoneHint}`
      : translations.removeForMeHint;

    Alert.alert(translations.deleteMessage, hint, buttons, {
      cancelable: true,
    });
  };

  const getSenderName = (senderId) => {
    if (senderId === currentUserId) return "You";
    let sender = userMap && userMap[senderId];
    if (sender && sender.displayName) return sender.displayName;
    if (allUsers[senderId] && allUsers[senderId].displayName) return allUsers[senderId].displayName;
    if (conversations && conversations[chatId]) {
      const userInMessages = conversations[chatId].find(msg => msg.sender === senderId);
      if (userInMessages && userInMessages.senderName) return userInMessages.senderName;
    }
    if (senderId && senderId.length > 8) return `User ${senderId.substring(0, 6)}`;
    return "User";
  };

  const getSenderAvatar = (senderId) => {
    if (senderId === currentUserId) return currentUser?.profilePic || placeholderAvatar;
    let sender = userMap && userMap[senderId];
    if (sender && sender.profilePic) return sender.profilePic;
    if (allUsers[senderId] && allUsers[senderId].profilePic) return allUsers[senderId].profilePic;
    return placeholderAvatar;
  };

  const renderMessage = ({ item }) => {
    const mine = normalizeId(item.sender) === normalizeId(currentUserId);
    const gradient = mine ? ["#4c669f", "#3b5998"] : getGradientForUser(item.sender);
    const senderName = getSenderName(item.sender);
    const senderPic = getSenderAvatar(item.sender);
    
    return (
      <View style={styles.messageWrapper}>
        <View style={[styles.senderNameContainer, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.senderName, { color: colors.primary }]}>
            {senderName}
          </Text>
        </View>
        
        <View style={[styles.groupMessageContainer, { flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end" }]}>
          <AvatarWithInitials imageUrl={senderPic} name={senderName} size={32} />
          
          <GHChatTouchable
            activeOpacity={0.7}
            onLongPress={() => handleDeleteMessage(item)}
            delayLongPress={400}
          >
            <LinearGradient colors={gradient} style={[styles.messageBubble, mine ? styles.myMessageBubble : styles.otherMessageBubble]}>
              {item.type === "image" && item.fileUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)} activeOpacity={0.8}>
                  <Image source={{ uri: item.fileUrl }} style={styles.imageMessage} resizeMode="cover" />
                  <Text style={styles.downloadText}>{translations.download}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: "white", fontSize: 15 }}>{item.text}</Text>
              )}
              <Text style={styles.timestamp}>
                {item.timestamp && typeof item.timestamp.toDate === "function"
                  ? formatDistanceToNow(new Date(item.timestamp.toDate()), { addSuffix: true })
                  : translations.sending}
              </Text>
            </LinearGradient>
          </GHChatTouchable>
        </View>
      </View>
    );
  };

  const listPaddingBottom =
    (keyboardHeight > 0 ? 12 : 12 + 88) + (keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingBottom: Platform.OS === "android" ? keyboardHeight : 0,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={Platform.OS === "ios" ? (insets.top || 12) + 56 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <AvatarWithInitials imageUrl={group?.profilePicture} name={headerTitle} size={40} />
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, { paddingBottom: listPaddingBottom }]}
          onContentSizeChange={() => {
            if (messages && messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{translations.startConversation}</Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.outline,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingBottom:
                10 + (keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8)),
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
          ]}
        >
          <TouchableOpacity onPress={sendImage} style={styles.attachmentButton}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TextInput
            placeholder={translations.typeMessage}
            value={messageText}
            onChangeText={setMessageText}
            style={[styles.input, { borderColor: colors.outline, color: colors.onSurface, backgroundColor: colors.surface }]}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
          />

          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>Uploading image...</Text>
        </View>
      )}
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingTop: 10,
    flexGrow: 1,
  },
  messageWrapper: {
    marginVertical: 5,
  },
  senderNameContainer: {
    marginBottom: 2,
    marginHorizontal: 10,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
  },
  groupMessageContainer: {
    alignItems: "flex-end",
    marginHorizontal: 5,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    maxWidth: "70%",
    marginHorizontal: 8,
  },
  myMessageBubble: {
    borderTopRightRadius: 4,
  },
  otherMessageBubble: {
    borderTopLeftRadius: 4,
  },
  timestamp: {
    fontSize: 10,
    color: "#dfe7f3",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  imageMessage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 5,
  },
  downloadText: {
    color: "#cce6ff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  attachmentButton: {
    marginRight: 10,
    padding: 5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 25,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
  uploadingOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    zIndex: 100,
  },
  uploadingText: {
    color: "white",
    marginTop: 10,
  },
});