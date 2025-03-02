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
  Keyboard,
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
const TOTAL_DURATION = 10000; // total duration in ms (10 seconds)

const ViewStoryScreen = () => {
  const { storyId, userId } = useLocalSearchParams();
  const router = useRouter();
  const { stories, recordView, deleteStory } = useStories();
  const { currentUser } = useAuth();
  const { setActiveChatId } = useChat();

  // Find the story
  const story = stories.find((s) => s.id === storyId);
  const [replyText, setReplyText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(TOTAL_DURATION);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationStartRef = useRef(Date.now());

  // Listener for keyboard focus on reply field to auto-pause
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        pauseAnimation();
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        resumeAnimation();
      },
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isPaused, remainingDuration]);

  useEffect(() => {
    if (!story) {
      Alert.alert("Story not found", "This story may have expired or been deleted.");
      router.back();
    }
  }, [story, router]);

  useEffect(() => {
    if (!story) {
      Alert.alert("Story not found");
      router.back();
      return;
    }
    // Record view (ensure recordView handles uniqueness)
    if (recordView && currentUser) {
      recordView(storyId, currentUser.uid);
    }
    setActiveChatId(null);

    // Start progress animation
    startAnimation(remainingDuration);
  }, [story]);

  const startAnimation = (duration) => {
    animationStartRef.current = Date.now();
    Animated.timing(progressAnim, {
      toValue: width,
      duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        router.back();
      }
    });
  };

  const pauseAnimation = () => {
    if (isPaused) return;
    setIsPaused(true);
    progressAnim.stopAnimation((currentValue) => {
      const elapsed = Date.now() - animationStartRef.current;
      const newRemaining = Math.max(remainingDuration - elapsed, 0);
      setRemainingDuration(newRemaining);
    });
  };

  const resumeAnimation = () => {
    if (!isPaused) return;
    setIsPaused(false);
    startAnimation(remainingDuration);
  };

  // Toggle pause/resume on image tap
  const togglePause = () => {
    if (isPaused) {
      resumeAnimation();
    } else {
      pauseAnimation();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
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

  const handleLongPress = () => {
    if (currentUser.uid !== story.userId) return;
    
    Alert.alert(
        "Delete Story",
        "Are you sure you want to delete this story?",
        [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteStory(storyId, story.imageURL);
                        Alert.alert("Success", "Story deleted successfully");
                        router.push("/(tabs)/chat"); // Changed from router.back() to explicitly navigate to chat
                    } catch (error) {
                        Alert.alert("Error", "Failed to delete story");
                    }
                }
            }
        ]
    );
  };

  if (!story) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: progressAnim }]} />
      </View>

      {/* Story Image */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={togglePause}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={styles.imageContainer}
      >
        <Image
          source={{ uri: story?.imageURL }}
          style={styles.storyImage}
          resizeMode="cover"
        />
        {/* Caption overlay */}
        {story.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{story.caption}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* For story owner: show view count in center at bottom */}
      {currentUser.uid === story.userId ? (
        <View style={styles.viewCountContainer}>
          <Text style={styles.viewCountText}>
            {story.views ? story.views.length : 0} Views
          </Text>
        </View>
      ) : (
        // For viewers: show reply input at bottom
        <View style={styles.replyContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Reply..."
            placeholderTextColor="#ccc"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={pauseAnimation}
            onBlur={resumeAnimation}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
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
  imageContainer: {
    flex: 1,
  },
  storyImage: {
    flex: 1,
    width: "100%",
  },
  captionContainer: {
    position: "absolute",
    top: "50%",
    left: "10%",
    right: "10%",
    backgroundColor: "rgba(37, 34, 34, 0.466)",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  captionText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
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
  viewCountContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  viewCountText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    backgroundColor: "rgba(0,170,255,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
