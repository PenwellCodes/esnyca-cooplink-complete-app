import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
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

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const ChatScreen = () => {
  const params = useLocalSearchParams();
  const user = params.user ? JSON.parse(params.user) : null;
  const { currentUser } = useAuth();
  const { conversations, markMessagesAsRead } = useChat();
  const chatId =
    currentUser.uid > user.uid
      ? `${currentUser.uid}_${user.uid}`
      : `${user.uid}_${currentUser.uid}`;

  // Local optimistic messages update
  const [localMessages, setLocalMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef(null);

  // Combine context messages with local optimistic messages.
  const contextMessages = conversations[chatId] || [];
  const messages = [...contextMessages, ...localMessages];

  useEffect(() => {
    // Mark messages as read when they update
    markMessagesAsRead(chatId, messages);
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    // Create a temporary message with a local id and local timestamp.
    const tempMessage = {
      id: Date.now().toString(), // temporary id
      sender: currentUser.uid,
      receiver: user.uid,
      text: messageText,
      timestamp: new Date(),
      status: "sent",
    };
    // Optimistically update local messages
    setLocalMessages((prev) => [...prev, tempMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      // Ensure conversation document exists
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
        });
      }
      // Add the message to Firestore
      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender: currentUser.uid,
        receiver: user.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        status: "sent",
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setMessageText("");
      // Clear local optimistic messages; onSnapshot will update with the actual message.
      setLocalMessages([]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          backgroundColor: "#007AFF",
        }}
      >
        <Image
          source={{ uri: user.profilePicture || placeholderAvatar }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
        <Text style={{ color: "white", fontSize: 18, marginLeft: 10 }}>
          {user.displayName}
        </Text>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start a conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                {
                  alignSelf:
                    item.sender === currentUser.uid ? "flex-end" : "flex-start",
                  backgroundColor:
                    item.sender === currentUser.uid ? "#007AFF" : "#E5E5E5",
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
                  : "Sending..."}
              </Text>
            </View>
          )}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
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
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
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
});
