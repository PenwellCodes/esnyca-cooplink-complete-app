import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStories } from "../../context/appstate/StoriesContext";
import { useAuth } from "../../context/appstate/AuthContext";
import { useChat } from "../../context/appstate/ChatContext";
import { useLanguage } from "../../context/appstate/LanguageContext";

const { width } = Dimensions.get("window");
const TOTAL_DURATION = 10000;
const TAP_ZONE_WIDTH = width * 0.32;

function getStoryCreatedAtMs(story) {
  if (!story?.createdAt) return 0;
  const ms = new Date(story.createdAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function sortStoriesNewestFirst(list) {
  return [...(list || [])].sort(
    (a, b) => getStoryCreatedAtMs(b) - getStoryCreatedAtMs(a)
  );
}

const ViewStoryScreen = () => {
  const insets = useSafeAreaInsets();
  const { storyId, userId } = useLocalSearchParams();
  const router = useRouter();
  const { stories, recordView, deleteStory } = useStories();
  const { currentUser } = useAuth();
  const { setActiveChatId, chatList, sendMessage } = useChat();
  const { currentLanguage, t } = useLanguage();

  const storyGroups = useMemo(() => {
    const groups = {};
    (stories || []).forEach((s) => {
      if (!s?.userId) return;
      if (!groups[s.userId]) groups[s.userId] = [];
      groups[s.userId].push(s);
    });
    return Object.entries(groups).map(([uid, list]) => ({
      userId: uid,
      stories: sortStoriesNewestFirst(list),
    }));
  }, [stories]);

  const initialGroupIndex = useMemo(() => {
    const idx = storyGroups.findIndex(
      (g) => String(g.userId) === String(userId)
    );
    return idx >= 0 ? idx : 0;
  }, [storyGroups, userId]);

  const initialStoryIndex = useMemo(() => {
    const group = storyGroups[initialGroupIndex];
    if (!group) return 0;
    const idx = group.stories.findIndex(
      (s) => String(s.id) === String(storyId)
    );
    return idx >= 0 ? idx : 0;
  }, [storyGroups, initialGroupIndex, storyId]);

  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(TOTAL_DURATION);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationStartRef = useRef(Date.now());
  const animationRef = useRef(null);
  const groupIndexRef = useRef(0);
  const storyIndexRef = useRef(0);
  const storyGroupsRef = useRef(storyGroups);

  groupIndexRef.current = groupIndex;
  storyIndexRef.current = storyIndex;
  storyGroupsRef.current = storyGroups;

  const currentGroup = storyGroups[groupIndex];
  const currentStories = currentGroup?.stories || [];
  const story = currentStories[storyIndex];
  const storyOwnerId = currentGroup?.userId || userId;

  const canGoPrevious = storyIndex > 0 || groupIndex > 0;
  const canGoNext =
    storyIndex < currentStories.length - 1 ||
    groupIndex < storyGroups.length - 1;

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
    previousStory: "Previous story",
    nextStory: "Next story",
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
        previousStory: await t("Previous story"),
        nextStory: await t("Next story"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setStoryIndex(initialStoryIndex);
    setRemainingDuration(TOTAL_DURATION);
  }, [initialGroupIndex, initialStoryIndex, storyId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
        pauseAnimation();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        resumeAnimation();
      }
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isPaused, remainingDuration]);

  useEffect(() => {
    if (!story && storyGroups.length === 0) {
      Alert.alert(
        translations.storyNotFound,
        translations.storyMayExpired
      );
      router.back();
    }
  }, [story, storyGroups.length, router, translations]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const startAnimation = useCallback(
    (duration) => {
      if (!story || isPaused) return;
      stopAnimation();
      animationStartRef.current = Date.now();
      progressAnim.setValue(0);

      animationRef.current = Animated.timing(progressAnim, {
        toValue: width,
        duration,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (!finished || isPaused) return;
        const gi = groupIndexRef.current;
        const si = storyIndexRef.current;
        const grps = storyGroupsRef.current;
        const list = grps[gi]?.stories || [];

        if (si < list.length - 1) {
          setStoryIndex(si + 1);
          setRemainingDuration(TOTAL_DURATION);
        } else if (gi < grps.length - 1) {
          setGroupIndex(gi + 1);
          setStoryIndex(0);
          setRemainingDuration(TOTAL_DURATION);
        } else {
          router.back();
        }
      });
    },
    [story, isPaused, progressAnim, router, stopAnimation]
  );

  useEffect(() => {
    if (!story) return;
    if (recordView && currentUser) {
      recordView(story.id, currentUser.uid);
    }
    setActiveChatId(null);
    setRemainingDuration(TOTAL_DURATION);
    startAnimation(TOTAL_DURATION);
    return () => stopAnimation();
  }, [story?.id, groupIndex]);

  const pauseAnimation = () => {
    if (isPaused) return;
    setIsPaused(true);
    stopAnimation();
    progressAnim.stopAnimation(() => {
      const elapsed = Date.now() - animationStartRef.current;
      setRemainingDuration(Math.max(remainingDuration - elapsed, 0));
    });
  };

  const resumeAnimation = () => {
    if (!isPaused) return;
    setIsPaused(false);
    startAnimation(remainingDuration);
  };

  const goToPrevious = useCallback(() => {
    stopAnimation();
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const grps = storyGroupsRef.current;

    if (si > 0) {
      setStoryIndex(si - 1);
      setRemainingDuration(TOTAL_DURATION);
      return;
    }
    if (gi > 0) {
      const prev = grps[gi - 1]?.stories || [];
      setGroupIndex(gi - 1);
      setStoryIndex(Math.max(0, prev.length - 1));
      setRemainingDuration(TOTAL_DURATION);
    }
  }, [stopAnimation]);

  const goToNext = useCallback(() => {
    stopAnimation();
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const grps = storyGroupsRef.current;
    const list = grps[gi]?.stories || [];

    if (si < list.length - 1) {
      setStoryIndex(si + 1);
      setRemainingDuration(TOTAL_DURATION);
      return;
    }
    if (gi < grps.length - 1) {
      setGroupIndex(gi + 1);
      setStoryIndex(0);
      setRemainingDuration(TOTAL_DURATION);
      return;
    }
    router.back();
  }, [stopAnimation, router]);

  const togglePause = () => {
    if (isPaused) resumeAnimation();
    else pauseAnimation();
  };

  const handleReply = async () => {
    if (!replyText.trim() || !story) return;
    try {
      const storyUser = chatList.find(
        (u) => String(u.uid) === String(storyOwnerId)
      );
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
          pathname: `/(screens)/chatConversations/${storyOwnerId}`,
          params: {
            user: JSON.stringify(storyUser),
            predefinedMessage: replyData.text,
            storyPreview: JSON.stringify(replyData.storyPreview),
          },
        });
      } else {
        const chatId =
          currentUser.uid > storyOwnerId
            ? `${currentUser.uid}_${storyOwnerId}`
            : `${storyOwnerId}_${currentUser.uid}`;
        await sendMessage({
          chatKey: chatId,
          receiverUserId: storyOwnerId,
          type: "story_reply",
          text: replyData.text,
          storyPreview: replyData.storyPreview,
        });
        Alert.alert(translations.replySentTitle, translations.replySentBody);
        setReplyText("");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      Alert.alert(translations.error, translations.failedToSendReply);
    }
  };

  const handleLongPress = () => {
    if (currentUser.uid !== story?.userId) return;

    Alert.alert(
      translations.deleteStoryTitle,
      translations.deleteStoryBody,
      [
        { text: translations.cancel, style: "cancel" },
        {
          text: translations.delete,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStory(story.id, story.imageURL);
              Alert.alert(
                translations.success,
                translations.storyDeletedSuccessfully
              );
              goToNext();
            } catch {
              Alert.alert(
                translations.error,
                translations.failedToDeleteStory
              );
            }
          },
        },
      ]
    );
  };

  if (!story) {
    return null;
  }

  const isOwner = currentUser.uid === story.userId;

  return (
    <View style={styles.container}>
      <View style={[styles.progressRow, { top: insets.top || 0 }]}>
        {currentStories.map((_, index) => (
          <View key={index} style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width:
                    index === storyIndex
                      ? progressAnim
                      : index < storyIndex
                      ? "100%"
                      : 0,
                },
              ]}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 10, right: 16 }]}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        <Pressable
          style={styles.tapZoneLeft}
          onPress={goToPrevious}
          disabled={!canGoPrevious}
          accessibilityLabel={translations.previousStory}
        />
        <Pressable
          style={styles.tapZoneRight}
          onPress={goToNext}
          accessibilityLabel={translations.nextStory}
        />

        <TouchableOpacity
          activeOpacity={1}
          onPress={togglePause}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={styles.imageTouchable}
        >
          <Image
            source={{ uri: story?.imageURL }}
            style={styles.storyImage}
            resizeMode="contain"
          />
          {story.caption ? (
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>{story.caption}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {canGoPrevious ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrevious}
            accessibilityLabel={translations.previousStory}
          >
            <Ionicons name="chevron-back" size={32} color="#fff" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonRight]}
          onPress={goToNext}
          accessibilityLabel={translations.nextStory}
        >
          <Ionicons
            name={canGoNext ? "chevron-forward" : "close"}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {isOwner ? (
        <View
          style={[styles.viewCountContainer, { bottom: insets.bottom + 20 }]}
        >
          <Text style={styles.viewCountText}>
            {story.views?.length || 0} {translations.views}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.replyContainer,
              { paddingBottom: isKeyboardVisible ? 10 : insets.bottom + 10 },
            ]}
          >
            <TextInput
              style={styles.replyInput}
              placeholder={translations.replyPlaceholder}
              placeholderTextColor="#999"
              value={replyText}
              onChangeText={setReplyText}
              onFocus={pauseAnimation}
              onBlur={resumeAnimation}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
              <Text style={styles.sendButtonText}>{translations.send}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  progressRow: {
    position: "absolute",
    left: 8,
    right: 8,
    flexDirection: "row",
    height: 3,
    zIndex: 10,
    gap: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
  },
  closeButton: {
    position: "absolute",
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  imageContainer: {
    flex: 1,
  },
  imageTouchable: {
    flex: 1,
  },
  tapZoneLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: TAP_ZONE_WIDTH,
    zIndex: 5,
  },
  tapZoneRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: TAP_ZONE_WIDTH,
    zIndex: 5,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  storyImage: {
    flex: 1,
    width: "100%",
  },
  captionContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  captionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,30,30,0.95)",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxHeight: 80,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
  viewCountContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  viewCountText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    backgroundColor: "rgba(0,170,255,0.8)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
});
