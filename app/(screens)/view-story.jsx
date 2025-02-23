import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStories } from "../../context/appstate/StoriesContext";
import { useAuth } from "../../context/appstate/AuthContext";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useChat } from "../../context/appstate/ChatContext";

const { width } = Dimensions.get("window");

const ViewStoryScreen = () => {
  const { storyId, userId } = useLocalSearchParams();
  const router = useRouter();
  const { stories, recordView } = useStories();
  const { currentUser } = useAuth();
  const { setActiveChatId } = useChat();

  // Find the story from our context
  const story = stories.find((s) => s.id === storyId);
  const [replyText, setReplyText] = useState("");

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!story) {
      Alert.alert("Story not found");
      router.back();
      return;
    }
    // Record that the current user has viewed the story (ensure uniqueness in your recordView implementation)
    if (recordView && currentUser) {
      recordView(storyId, currentUser.uid);
    }
    // Set this story as active in ChatContext if needed
    setActiveChatId(null);

    // Animate progress bar over 5 seconds
    Animated.timing(progressAnim, {
      toValue: width,
      duration: 5000,
      useNativeDriver: false,
    }).start(() => {
      // After story duration, navigate back (or proceed to next story if implemented)
      router.back();
    });
  }, [story]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      // Create or update a chat between the viewer and the story owner
      const chatId =
        currentUser.uid > userId
          ? `${currentUser.uid}_${userId}`
          : `${userId}_${currentUser.uid}`;
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, userId],
          createdAt: serverTimestamp(),
        });
      }
      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender: currentUser.uid,
        receiver: userId,
        text: replyText,
        type: "text",
        timestamp: serverTimestamp(),
        status: "sent",
      });
      Alert.alert("Reply Sent", "Your reply has been sent to the story owner.");
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
      Alert.alert("Error", "Failed to send reply.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: progressAnim }]} />
      </View>
      {/* Story Image */}
      <Image
        source={{ uri: story?.imageURL }}
        style={styles.storyImage}
        resizeMode="cover"
      />
      {/* Reply Input */}
      <View style={styles.replyContainer}>
        <TextInput
          style={styles.replyInput}
          placeholder="Reply..."
          placeholderTextColor="#ccc"
          value={replyText}
          onChangeText={setReplyText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ViewStoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#555",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
  },
  storyImage: {
    flex: 1,
    width: "100%",
  },
  replyContainer: {
    position: "absolute",
    bottom: 30,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    padding: 10,
  },
  sendButton: {
    padding: 10,
  },
  sendButtonText: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});
