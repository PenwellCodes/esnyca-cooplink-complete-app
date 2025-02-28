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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../../context/appstate/ChatContext";
import { useAuth } from "../../context/appstate/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  query,
  getDocs,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { LinearGradient } from "expo-linear-gradient";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

// Define a set of gradient colors.
const colorGradients = [
  ["#8A2BE2", "#9370DB"], // Purple gradient
  ["#FF4500", "#FF6347"], // Red/Orange gradient
  ["#32CD32", "#3CB371"], // Green gradient
  ["#1E90FF", "#00BFFF"], // Blue gradient
  ["#FF1493", "#FF69B4"], // Pink gradient
  ["#FFD700", "#FFA500"], // Yellow/Orange gradient
  ["#00CED1", "#20B2AA"], // Teal gradient
];

// A simple hash function to pick a gradient based on UID.
const getGradientForUser = (uid) => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorGradients.length;
  return colorGradients[index];
};

const ChatScreen = () => {
  const params = useLocalSearchParams();
  // For group chats, a "group" param is provided; for individual chats, a "user" param is provided.
  const group = params.group ? JSON.parse(params.group) : null;
  const individualUser = params.user ? JSON.parse(params.user) : null;
  const { currentUser } = useAuth();
  const { conversations, markMessagesAsRead, setActiveChatId, userMap } =
    useChat();

  // Compute chatId:
  const chatId = group
    ? group.uid
    : currentUser.uid > individualUser.uid
      ? `${currentUser.uid}_${individualUser.uid}`
      : `${individualUser.uid}_${currentUser.uid}`;

  // Header details: for group, use group info; otherwise, use individual user info.
  const headerAvatar = group
    ? group.profilePicture
    : individualUser.profilePic || placeholderAvatar;
  const headerTitle = group ? group.displayName : individualUser.displayName;

  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);

  const contextMessages = conversations[chatId] || [];
  const messages = [...contextMessages, ...localMessages];

  // Set active chat ID when entering/leaving.
  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  // Request media library permissions.
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need media library permissions to make this work!",
        );
      }
    })();
  }, []);

  useEffect(() => {
    markMessagesAsRead(chatId, messages);
  }, [messages]);

  // Send a text message.
  const sendMessage = async () => {
    if (!messageText.trim()) return;
    const receiver = group ? group.uid : individualUser.uid;
    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver,
      text: messageText,
      type: "text",
      timestamp: new Date(),
      status: "sent",
    };
    setLocalMessages((prev) => [...prev, tempMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      
      if (!chatDocSnap.exists()) {
        if (group) {
          // For group chats, create an array of all users
          const usersQuery = query(collection(db, "users"));
          const usersSnapshot = await getDocs(usersQuery);
          const allUserIds = usersSnapshot.docs.map(doc => doc.data().uid);
          
          await setDoc(chatDocRef, {
            participants: allUserIds, // Add all users as participants
            isGroup: true,
            createdAt: serverTimestamp(),
          });
        } else {
          // For individual chats, keep existing behavior
          await setDoc(chatDocRef, {
            participants: [currentUser.uid, individualUser.uid],
            createdAt: serverTimestamp(),
          });
        }
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender: currentUser.uid,
        receiver,
        text: messageText,
        type: "text",
        timestamp: serverTimestamp(),
        status: "sent",
        isGroupMessage: group ? true : false, // Add this flag
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setMessageText("");
      setLocalMessages([]);
    }
  };

  // Upload file helper.
  const uploadFile = async (uri, storagePath) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, storagePath);
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        },
      );
    });
  };

  // Pick image helper.
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  // Pick file helper.
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === "success") return result;
    return null;
  };

  // Send image message.
  const sendImage = async () => {
    const uri = await pickImage();
    if (!uri) return;
    const receiver = group ? group.uid : individualUser.uid;
    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver,
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
      const storagePath = `chatAttachments/${chatId}/${Date.now()}_${fileName}`;
      const downloadURL = await uploadFile(uri, storagePath);

      const message = {
        sender: currentUser.uid,
        receiver,
        fileUrl: downloadURL,
        fileName,
        type: "image",
        timestamp: serverTimestamp(),
        status: "sent",
      };

      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        if (group) {
          await setDoc(chatDocRef, {
            participants: [currentUser.uid],
            createdAt: serverTimestamp(),
          });
        } else {
          await setDoc(chatDocRef, {
            participants: [currentUser.uid, individualUser.uid],
            createdAt: serverTimestamp(),
          });
        }
      }
      await addDoc(collection(db, "chats", chatId, "messages"), message);
      setLocalMessages([]);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Send file message.
  const sendFile = async () => {
    const result = await pickFile();
    if (!result) return;
    setUploading(true);
    setUploadProgress(0);
    const receiver = group ? group.uid : individualUser.uid;
    try {
      const { uri, name } = result;
      const fileName = name || uri.split("/").pop();
      const storagePath = `chatAttachments/${chatId}/${Date.now()}_${fileName}`;
      const downloadURL = await uploadFile(uri, storagePath);
      const message = {
        sender: currentUser.uid,
        receiver,
        fileUrl: downloadURL,
        fileName,
        type: "file",
        timestamp: serverTimestamp(),
        status: "sent",
      };

      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        if (group) {
          await setDoc(chatDocRef, {
            participants: [currentUser.uid],
            createdAt: serverTimestamp(),
          });
        } else {
          await setDoc(chatDocRef, {
            participants: [currentUser.uid, individualUser.uid],
            createdAt: serverTimestamp(),
          });
        }
      }
      await addDoc(collection(db, "chats", chatId, "messages"), message);
    } catch (error) {
      console.error("Error sending file:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Render the message bubble content.
  const renderBubbleContent = (item) => {
    if (item.type === "image") {
      return (
        <TouchableOpacity
          onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: item.fileUrl }}
            style={styles.imageMessage}
            resizeMode="contain"
          />
          <View style={styles.imageActions}>
            {item.status === "uploading" ? (
              <ActivityIndicator
                size="small"
                color={getGradientForUser(item.sender)[0]}
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
                  color={getGradientForUser(item.sender)[0]}
                />
                <Text
                  style={{
                    color: getGradientForUser(item.sender)[0],
                    marginLeft: 5,
                    fontSize: 12,
                  }}
                >
                  Download
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.timestamp}>
              {item.timestamp && typeof item.timestamp.toDate === "function"
                ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                    addSuffix: true,
                  })
                : "Sending..."}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    if (item.type === "file") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="document-text-outline"
            size={24}
            color={getGradientForUser(item.sender)[0]}
          />
          <View style={{ marginLeft: 8 }}>
            <Text
              style={{
                color: getGradientForUser(item.sender)[0],
                fontWeight: "bold",
              }}
            >
              {item.fileName}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}>
              <Text style={{ color: getGradientForUser(item.sender)[0] }}>
                Download
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {item.timestamp && typeof item.timestamp.toDate === "function"
                ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                    addSuffix: true,
                  })
                : "Sending..."}
            </Text>
          </View>
        </View>
      );
    }
    // Default: text message.
    return <Text style={{ color: "white" }}>{item.text}</Text>;
  };

  // Render each message. For group chats, include the sender's avatar and use dynamic colors.
  const renderMessage = ({ item }) => {
    // For group chats, use the dynamic gradient based on sender; for one-on-one, use default gradients.
    const gradientColors = group
      ? getGradientForUser(item.sender)
      : item.sender === currentUser.uid
        ? ["#4c669f", "#3b5998"]
        : ["#e0e0e0", "#cfcfcf"];

    // For group chats, obtain sender's profile picture from userMap.
    const senderProfilePic = group
      ? userMap[item.sender]?.profilePic || placeholderAvatar
      : null;

    // If group chat, wrap bubble with an avatar.
    if (group) {
      return (
        <View
          style={[
            styles.groupMessageContainer,
            {
              flexDirection:
                item.sender === currentUser.uid ? "row-reverse" : "row",
            },
          ]}
        >
          <Image
            source={{ uri: senderProfilePic }}
            style={styles.senderAvatar}
          />
          <LinearGradient colors={gradientColors} style={styles.messageBubble}>
            {renderBubbleContent(item)}
          </LinearGradient>
        </View>
      );
    }
    // Otherwise, render as before.
    return (
      <LinearGradient
        colors={gradientColors}
        style={[
          styles.messageBubble,
          {
            alignSelf:
              item.sender === currentUser.uid ? "flex-end" : "flex-start",
          },
        ]}
      >
        {renderBubbleContent(item)}
        <Text style={styles.timestamp}>
          {item.timestamp && typeof item.timestamp.toDate === "function"
            ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                addSuffix: true,
              })
            : "Sending..."}
        </Text>
      </LinearGradient>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: headerAvatar || placeholderAvatar }}
          style={styles.headerAvatar}
        />
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start a conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10 }}
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

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={sendImage} style={styles.attachmentButton}>
          <Ionicons name="image-outline" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#007AFF",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
  groupMessageContainer: {
    alignItems: "flex-end",
    marginVertical: 5,
    marginHorizontal: 10,
  },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
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
});
