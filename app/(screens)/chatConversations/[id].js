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
import { useChat } from "../../../context/appstate/ChatContext";
import { useAuth } from "../../../context/appstate/AuthContext";
import { db } from "../../../firebase/firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
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

const ChatScreen = () => {
  const params = useLocalSearchParams();
  const user = params.user ? JSON.parse(params.user) : null;
  const { currentUser } = useAuth();
  const { conversations, markMessagesAsRead, setActiveChatId } = useChat(); // Add setActiveChatId
  const chatId =
    currentUser.uid > user.uid
      ? `${currentUser.uid}_${user.uid}`
      : `${user.uid}_${currentUser.uid}`;

  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);

  const contextMessages = conversations[chatId] || [];
  const messages = [...contextMessages, ...localMessages];

  // Set activeChatId when entering/leaving the chat
  useEffect(() => {
    setActiveChatId(chatId); // Set current chat as active
    return () => setActiveChatId(null); // Clear when leaving
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need media library permissions to make this work!"
        );
      }
    })();
  }, []);

  useEffect(() => {
    markMessagesAsRead(chatId, messages);
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    const tempMessage = {
      id: Date.now().toString(),
      sender: currentUser.uid,
      receiver: user.uid,
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
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
        });
      }
      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender: currentUser.uid,
        receiver: user.uid,
        text: messageText,
        type: "text",
        timestamp: serverTimestamp(),
        status: "sent",
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setMessageText("");
      setLocalMessages([]);
    }
  };

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
        }
      );
    });
  };

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

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === "success") return result;
    return null;
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
      const storagePath = `chatAttachments/${chatId}/${Date.now()}_${fileName}`;
      const downloadURL = await uploadFile(uri, storagePath);

      const message = {
        sender: currentUser.uid,
        receiver: user.uid,
        fileUrl: downloadURL,
        fileName,
        type: "image",
        timestamp: serverTimestamp(),
        status: "sent",
      };

      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
        });
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

  const sendFile = async () => {
    const result = await pickFile();
    if (!result) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const { uri, name } = result;
      const fileName = name || uri.split("/").pop();
      const storagePath = `chatAttachments/${chatId}/${Date.now()}_${fileName}`;
      const downloadURL = await uploadFile(uri, storagePath);

      const message = {
        sender: currentUser.uid,
        receiver: user.uid,
        fileUrl: downloadURL,
        fileName,
        type: "file",
        timestamp: serverTimestamp(),
        status: "sent",
      };

      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "chats", chatId, "messages"), message);
    } catch (error) {
      console.error("Error sending file:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const renderMessage = ({ item }) => {
    if (item.type === "image") {
      return (
        <View
          style={{
            alignSelf: item.sender === currentUser.uid ? "flex-end" : "flex-start",
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
                    color={item.sender === currentUser.uid ? "#cce6ff" : "#007AFF"}
                  />
                  <Text
                    style={{
                      color: item.sender === currentUser.uid ? "#cce6ff" : "#007AFF",
                      marginLeft: 5,
                      fontSize: 12,
                    }}
                  >
                    Download
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.timestamp}>
                {item.timestamp &&
                  typeof item.timestamp.toDate === "function"
                  ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                    addSuffix: true,
                  })
                  : "Sending..."}
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
                Download
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {item.timestamp &&
                typeof item.timestamp.toDate === "function"
                ? formatDistanceToNow(new Date(item.timestamp.toDate()), {
                  addSuffix: true,
                })
                : "Sending..."}
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
          {item.timestamp &&
            typeof item.timestamp.toDate === "function"
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
      <View style={styles.header}>
        <Image
          source={{ uri: user.profilePicture || placeholderAvatar }}
          style={styles.headerAvatar}
        />
        <Text style={styles.headerTitle}>{user.displayName}</Text>
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