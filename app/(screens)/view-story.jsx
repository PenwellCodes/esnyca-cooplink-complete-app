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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStories } from "../../context/appstate/StoriesContext";
import { useAuth } from "../../context/appstate/AuthContext";
import { useChat } from "../../context/appstate/ChatContext";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

const { width } = Dimensions.get("window");
const TOTAL_DURATION = 10000; // total duration in ms (10 seconds)

const ViewStoryScreen = () => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { storyId, userId } = useLocalSearchParams();
  const router = useRouter();
  const { stories, recordView, deleteStory } = useStories();
  const { currentUser } = useAuth();
  const { setActiveChatId, chatList, sendMessage } = useChat();
  const { currentLanguage, t } = useLanguage();

  // Find the story
  const story = stories.find((s) => s.id === storyId);
  const [replyText, setReplyText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(TOTAL_DURATION);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationStartRef = useRef(Date.now());

  const [translations, setTranslations] = useState({
    storyNotFound: "Story not found",
    storyMayExpired: "This story may have expired or been deleted.",
    replyPlaceholder: "Reply...",
    send: "Send",
    replySentTitle: "Reply Sent",
    replySentBody: "Your reply has been sent to the story owner.",
    error: "Error",
    failedToSendReply: "Failed to send reply.",
    deleteStoryTitle: "Delete Story",
    deleteStoryBody: "Are you sure you want to delete this story?",
    cancel: "Cancel",
    delete: "Delete",
    success: "Success",
    storyDeletedSuccessfully: "Story deleted successfully",
    failedToDeleteStory: "Failed to delete story",
    views: "Views",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        storyNotFound: await t("Story not found"),
        storyMayExpired: await t(
          "This story may have expired or been deleted."
        ),
        replyPlaceholder: await t("Reply..."),
        send: await t("Send"),
        replySentTitle: await t("Reply Sent"),
        replySentBody: await t(
          "Your reply has been sent to the story owner."
        ),
        error: await t("Error"),
        failedToSendReply: await t("Failed to send reply."),
        deleteStoryTitle: await t("Delete Story"),
        deleteStoryBody: await t(
          "Are you sure you want to delete this story?"
        ),
        cancel: await t("Cancel"),
        delete: await t("Delete"),
        success: await t("Success"),
        storyDeletedSuccessfully: await t("Story deleted successfully"),
        failedToDeleteStory: await t("Failed to delete story"),
        views: await t("Views"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

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
      Alert.alert(
        translations.storyNotFound,
        translations.storyMayExpired
      );
      router.back();
    }
  }, [story, router]);

  useEffect(() => {
    if (!story) {
      Alert.alert(translations.storyNotFound);
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
      const storyUser = chatList.find((u) => String(u.uid) === String(userId));
      const replyData = {
        text: replyText.trim(),
        storyPreview: {
          imageURL: story?.imageURL,
          caption: story?.caption || "",
          storyId: story?.id,
        },
      };

      if (storyUser) {
        router.push({
          pathname: `/(screens)/chatConversations/${userId}`,
          params: {
            user: JSON.stringify(storyUser),
            predefinedMessage: replyData.text,
            storyPreview: JSON.stringify(replyData.storyPreview),
          },
        });
      } else {
        const chatId =
          currentUser.uid > userId
            ? `${currentUser.uid}_${userId}`
            : `${userId}_${currentUser.uid}`;
        await sendMessage({
          chatKey: chatId,
          receiverUserId: userId,
          type: "story_reply",
          text: replyData.text,
          storyPreview: replyData.storyPreview,
        });
        Alert.alert(translations.replySentTitle, translations.replySentBody);
      }
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
      Alert.alert(translations.error, translations.failedToSendReply);
    }
  };

  const handleLongPress = () => {
    if (currentUser.uid !== story.userId) return;
    
    Alert.alert(
        translations.deleteStoryTitle,
        translations.deleteStoryBody,
        [
            {
                text: translations.cancel,
                style: "cancel"
            },
            {
                text: translations.delete,
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteStory(storyId, story.imageURL);
                        Alert.alert(translations.success, translations.storyDeletedSuccessfully);
                        router.push("/(tabs)/chat"); // Changed from router.back() to explicitly navigate to chat
                    } catch (error) {
                        Alert.alert(translations.error, translations.failedToDeleteStory);
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
        <View
          style={[
            styles.viewCountContainer,
            { bottom: 16 + insets.bottom + keyboardHeight },
          ]}
        >
          <Text style={styles.viewCountText}>
            {story.views ? story.views.length : 0} {translations.views}
          </Text>
        </View>
      ) : (
        // For viewers: show reply input at bottom
        <View
          style={[
            styles.replyContainer,
            { bottom: 16 + insets.bottom + keyboardHeight },
          ]}
        >
          <TextInput
            style={styles.replyInput}
            placeholder={translations.replyPlaceholder}
            placeholderTextColor="#ccc"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={pauseAnimation}
            onBlur={resumeAnimation}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
            <Text style={styles.sendButtonText}>{translations.send}</Text>
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
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 10,
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
