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

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

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

const ChatScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const group = params.group ? JSON.parse(params.group) : null;
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?.uid;
  const { conversations, markMessagesAsRead, setActiveChatId, userMap, sendMessage, refreshChats } = useChat();
  const chatId = group?.uid || "group_swazi_cooperators";
  const headerTitle = group?.displayName || "Group";
  const insets = useSafeAreaInsets();

  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [allUsers, setAllUsers] = useState({}); // Store all users for fallback
  const { currentLanguage, t } = useLanguage();

  const [translations, setTranslations] = useState({
    startConversation: "Start a conversation",
    typeMessage: "Type a message...",
    download: "Download",
    sending: "Sending...",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        startConversation: await t("Start a conversation"),
        typeMessage: await t("Type a message..."),
        download: await t("Download"),
        sending: await t("Sending..."),
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

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Get messages safely
  const contextMessages = conversations && conversations[chatId] ? conversations[chatId] : [];
  const messages = [...contextMessages, ...localMessages];

  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      markMessagesAsRead(chatId, messages);
    }
  }, [messages, chatId]);

  // Auto-scroll to bottom when keyboard opens
  useEffect(() => {
    if (isKeyboardVisible && messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isKeyboardVisible, messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0 && !isKeyboardVisible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

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

  // FIXED: Get sender name from multiple sources
  const getSenderName = (senderId) => {
    if (senderId === currentUserId) return "You";
    
    // Try userMap from ChatContext first
    let sender = userMap && userMap[senderId];
    if (sender && sender.displayName) {
      return sender.displayName;
    }
    
    // Try allUsers dictionary (fetched directly from API)
    if (allUsers[senderId] && allUsers[senderId].displayName) {
      return allUsers[senderId].displayName;
    }
    
    // Try to find in conversations data
    if (conversations && conversations[chatId]) {
      const messagesList = conversations[chatId];
      const userInMessages = messagesList.find(msg => msg.sender === senderId);
      if (userInMessages && userInMessages.senderName) {
        return userInMessages.senderName;
      }
    }
    
    // Last resort - use a shortened version of the user ID
    if (senderId && senderId.length > 8) {
      return `User ${senderId.substring(0, 6)}`;
    }
    
    return "User";
  };

  // FIXED: Get sender avatar from multiple sources
  const getSenderAvatar = (senderId) => {
    if (senderId === currentUserId) {
      return currentUser?.profilePic || placeholderAvatar;
    }
    
    // Try userMap
    let sender = userMap && userMap[senderId];
    if (sender && sender.profilePic) {
      return sender.profilePic;
    }
    
    // Try allUsers
    if (allUsers[senderId] && allUsers[senderId].profilePic) {
      return allUsers[senderId].profilePic;
    }
    
    return placeholderAvatar;
  };

  const renderMessage = ({ item }) => {
    const mine = item.sender === currentUserId;
    const gradient = mine ? ["#4c669f", "#3b5998"] : getGradientForUser(item.sender);
    const senderName = getSenderName(item.sender);
    const senderPic = getSenderAvatar(item.sender);
    
    return (
      <View style={styles.messageWrapper}>
        {/* Sender Name - Always show */}
        <View style={[styles.senderNameContainer, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.senderName, { color: colors.primary }]}>
            {senderName}
          </Text>
        </View>
        
        <View style={[styles.groupMessageContainer, { flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end" }]}>
          <AvatarWithInitials imageUrl={senderPic} name={senderName} size={32} />
          
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
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <AvatarWithInitials imageUrl={group?.profilePicture} name={headerTitle} size={40} />
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          if (messages && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{translations.startConversation}</Text>
          </View>
        }
      />

      {/* Uploading Indicator */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>Uploading image...</Text>
        </View>
      )}

      {/* Input Container */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.outline, paddingBottom: insets.bottom || 8 }]}>
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
    paddingBottom: 10,
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