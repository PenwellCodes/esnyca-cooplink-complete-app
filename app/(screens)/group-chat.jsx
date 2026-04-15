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
import { useChat } from "../../context/appstate/ChatContext";
import { useAuth } from "../../context/appstate/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";
import { useTheme } from "react-native-paper";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

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
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const group = params.group ? JSON.parse(params.group) : null;
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?.uid;
  const { conversations, markMessagesAsRead, setActiveChatId, userMap, sendMessage } = useChat();
  const chatId = group?.uid || "group_swazi_cooperators";
  const headerAvatar = group?.profilePicture || placeholderAvatar;
  const headerTitle = group?.displayName || "Group";

  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const kbOffset = Platform.OS === "ios" ? keyboardHeight : 0;
  const inputBarReserve = 56 + Math.max(insets.bottom, 8) + (Platform.OS === "android" ? keyboardHeight : kbOffset);
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

  const contextMessages = conversations[chatId] || [];
  const messages = [...contextMessages, ...localMessages];

  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    markMessagesAsRead(chatId, messages);
  }, [messages, chatId]);

  const uploadFile = async (uri, fileName = `file-${Date.now()}.jpg`) => {
    const formData = new FormData();
    formData.append("image", { uri, name: fileName, type: "image/jpeg" });
    const uploadResult = await apiRequest("/upload", { method: "POST", body: formData });
    return uploadResult?.imageUrl;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const temp = {
      id: Date.now().toString(),
      sender: currentUserId,
      text: messageText,
      type: "text",
      timestamp: new Date(),
      status: "sending",
    };
    setLocalMessages((p) => [...p, temp]);
    try {
      await sendMessage({ chatKey: chatId, type: "text", text: messageText });
      setMessageText("");
      setLocalMessages((p) => p.filter((m) => m.id !== temp.id));
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to send message");
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
    try {
      const fileName = uri.split("/").pop();
      const downloadURL = await uploadFile(uri, fileName);
      await sendMessage({ chatKey: chatId, type: "image", fileUrl: downloadURL, fileName });
      setSelectedImage(null);
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const mine = item.sender === currentUserId;
    const gradient = mine ? ["#4c669f", "#3b5998"] : getGradientForUser(item.sender);
    const senderPic = userMap[item.sender]?.profilePic || placeholderAvatar;
    return (
      <View style={[styles.groupMessageContainer, { flexDirection: mine ? "row-reverse" : "row" }]}>
        <Image source={{ uri: senderPic }} style={styles.senderAvatar} />
        <LinearGradient colors={gradient} style={styles.messageBubble}>
          {item.type === "image" && item.fileUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
              <Image source={{ uri: item.fileUrl }} style={styles.imageMessage} resizeMode="contain" />
            </TouchableOpacity>
          ) : (
            <Text style={{ color: "white" }}>{item.text}</Text>
          )}
          <Text style={styles.timestamp}>
            {item.timestamp && typeof item.timestamp.toDate === "function"
              ? formatDistanceToNow(new Date(item.timestamp.toDate()), { addSuffix: true })
              : translations.sending}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} />
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>
      {messages.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingBottom: inputBarReserve }]}>
          <Text style={styles.emptyText}>{translations.startConversation}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, paddingBottom: 16 + inputBarReserve }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
      <View style={[styles.inputContainer, { bottom: kbOffset, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={sendImage} style={styles.attachmentButton}>
          <Ionicons name="image-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TextInput
          placeholder={translations.typeMessage}
          value={messageText}
          onChangeText={setMessageText}
          style={[styles.input, { color: colors.onSurface, borderColor: colors.outline }]}
          placeholderTextColor={colors.onSurfaceVariant}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#007AFF" },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerTitle: { color: "white", fontSize: 18, marginLeft: 10 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#777" },
  groupMessageContainer: { alignItems: "flex-end", marginVertical: 5, marginHorizontal: 10 },
  senderAvatar: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 5 },
  messageBubble: { padding: 10, borderRadius: 15, maxWidth: "70%" },
  timestamp: { fontSize: 10, color: "#dfe7f3", marginTop: 4 },
  imageMessage: { width: 200, height: 150, borderRadius: 10, marginBottom: 5 },
  inputContainer: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, borderTopColor: "#ccc" },
  attachmentButton: { marginHorizontal: 5 },
  input: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 8 },
  sendButton: { marginLeft: 10 },
  uploadingOverlay: { position: "absolute", top: "50%", left: 0, right: 0, alignItems: "center" },
});
