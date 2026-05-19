import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { TouchableOpacity as GHChatTouchable } from "react-native-gesture-handler";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { typography, images } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";
import { useChat } from "../../context/appstate/ChatContext";
import StoryViewer from "../../components/StoryViewer";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { HOME_ROUTE } from "../../utils/routes";
import { readDataCache, CACHE_KEYS } from "../../utils/dataCache";
import { formatMessagePreview } from "../../utils/chatMessagePreview";
import FetchState from "../../components/FetchState";

const GLOBAL_GROUP_CHAT_KEY = "group_swazi_cooperators";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const normalizeId = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const buildDirectKey = (a, b) => {
  const aa = normalizeId(a);
  const bb = normalizeId(b);

  if (!aa || !bb) return null;

  return aa > bb ? `${aa}_${bb}` : `${bb}_${aa}`;
};

const CHAT_ROW_LONG_PRESS_MS = 400;

/** Row wrapper that reliably receives long-press inside FlatList + gesture-handler root. */
const ChatRow = ({
  style,
  selected,
  onPress,
  onLongPress,
  children,
}) => (
  <GHChatTouchable
    style={[style, selected && styles.chatItemSelected]}
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={CHAT_ROW_LONG_PRESS_MS}
    activeOpacity={0.7}
  >
    {children}
  </GHChatTouchable>
);

function viewerHasSeenStory(story, viewerUid) {
  if (!viewerUid || !story) return false;

  const views = story.views;

  if (!Array.isArray(views) || views.length === 0) return false;

  const u = String(viewerUid).toLowerCase();

  return views.some((v) => String(v).toLowerCase() === u);
}

function hasAnyUnviewedStory(storiesList, viewerUid) {
  if (!viewerUid || !storiesList?.length) return true;

  return storiesList.some((s) => !viewerHasSeenStory(s, viewerUid));
}

function getStoryCreatedAtMs(story) {
  if (!story?.createdAt) return 0;
  const ms = new Date(story.createdAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Newest story first (for circle thumbnail and viewer). */
function sortStoriesNewestFirst(list) {
  return [...(list || [])].sort(
    (a, b) => getStoryCreatedAtMs(b) - getStoryCreatedAtMs(a)
  );
}

const getUserInitials = (displayName) => {
  if (!displayName || displayName === "User") return "?";
  if (displayName === "Me" || displayName === "You") return "U";

  const nameParts = displayName.split(" ");

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return displayName.substring(0, 2).toUpperCase();
};

const AvatarWithInitials = ({ imageUrl, name, size = 48 }) => {
  const [imageError, setImageError] = useState(false);

  const initials = getUserInitials(name);

  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#007AFF",
        },
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: size * 0.4,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const StoryAvatar = ({
  imageUrl,
  name,
  size = 56,
  showNewHighlight = false,
  isAddStory = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = getUserInitials(name);

  if (isAddStory) {
    return (
      <View
        style={[
          styles.statusBorder,
          styles.addStoryBorder,
          {
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.statusInner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <View style={styles.addStoryInner}>
            <Ionicons
              name="add-circle"
              size={size * 0.5}
              color="#007AFF"
            />
          </View>
        </View>
      </View>
    );
  }

  if (showNewHighlight) {
    return (
      <LinearGradient
        colors={["#a8e0ff", "#8ee3f5"]}
        style={[
          styles.statusBorder,
          {
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.statusInner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.statusImage,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={[
                styles.initialsStoryAvatar,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: "#007AFF",
                },
              ]}
            >
              <Text
                style={[
                  styles.initialsStoryText,
                  {
                    fontSize: size * 0.35,
                  },
                ]}
              >
                {initials}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.statusBorder,
        styles.statusSeenRing,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
        },
      ]}
    >
      <View
        style={[
          styles.statusInner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.statusImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.initialsStoryAvatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: "#007AFF",
              },
            ]}
          >
            <Text
              style={[
                styles.initialsStoryText,
                {
                  fontSize: size * 0.35,
                },
              ]}
            >
              {initials}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ChatList = () => {
  const { colors } = useTheme();

  const router = useRouter();

  const navigation = useNavigation();

  const { currentUser } = useAuth();

  const currentUserId = currentUser?.id || currentUser?.uid;

  const { stories: activeStories, refreshStories } = useStories();

  const {
    chatList: baseUserList,
    conversations,
    lastMessages,
    loadingChats,
    markMessagesAsRead,
    refreshChats,
    unreadCounts,
    userMap,
    deleteChat,
    filterMessagesForChat,
    hiddenMessagesByChat,
    chatSyncError,
  } = useChat();

  const { currentLanguage, t } = useLanguage();

  const [userNamesMap, setUserNamesMap] = useState({});
  const [userAvatarsMap, setUserAvatarsMap] = useState({});
  const [loadingNames, setLoadingNames] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const lastRefreshRef = useRef(0);

  const [chatPendingDeleteKey, setChatPendingDeleteKey] = useState(null);

  const [translations, setTranslations] = useState({
    chat: "Chat",
    addStory: "Add Story",
    me: "Me",
    unknownUser: "Unknown User",
    unknown: "Unknown",
    startConversation: "Start a conversation",
    fileSent: "📂 File sent",
    deleteChatTitle: "Delete chat",
    deleteChatMessage:
      "Are you sure you want to delete this chat? All messages will be removed.",
    ok: "OK",
    cancel: "Cancel",
    deleteFailed: "Could not delete chat. Please try again.",
    loadingChatsText: "Loading chats...",
    networkError: "Unable to load chats. Please check your internet connection.",
    tryAgain: "Try again",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        chat: await t("Chat"),
        addStory: await t("Add Story"),
        me: await t("Me"),
        unknownUser: await t("Unknown User"),
        unknown: await t("Unknown"),
        startConversation: await t("Start a conversation"),
        fileSent: await t("📂 File sent"),
        deleteChatTitle: await t("Delete chat"),
        deleteChatMessage: await t(
          "Are you sure you want to delete this chat? All messages will be removed."
        ),
        ok: await t("OK"),
        cancel: await t("Cancel"),
        deleteFailed: await t("Could not delete chat. Please try again."),
        loadingChatsText: await t("Loading chats..."),
        networkError: await t(
          "Unable to load chats. Please check your internet connection."
        ),
        tryAgain: await t("Try again"),
      });
    };

    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    if (loadingChats && !hasLoadedOnce) {
      const timer = setTimeout(() => {
        console.log("Loading timeout - forcing stop");
        setLoadingTimeout(true);
        setHasLoadedOnce(true);
      }, 8000);

      return () => clearTimeout(timer);
    } else if (!loadingChats) {
      setHasLoadedOnce(true);
      setLoadingTimeout(false);
    }
  }, [loadingChats, hasLoadedOnce]);

  useEffect(() => {
    const buildUserMaps = async () => {
      if (!activeStories || activeStories.length === 0) {
        setLoadingNames(false);
        return;
      }

      setLoadingNames(true);

      try {
        const namesMap = {};
        const avatarsMap = {};

        namesMap[currentUserId] = translations.me;
        avatarsMap[currentUserId] = currentUser?.profilePic || "";

        Object.values(userMap || {}).forEach((user) => {
          if (!user?.uid) return;
          namesMap[user.uid] =
            user.displayName || namesMap[user.uid] || "User";
          if (user.profilePic) {
            avatarsMap[user.uid] = user.profilePic;
          }
        });

        baseUserList.forEach((user) => {
          if (user.uid) {
            namesMap[user.uid] =
              user.displayName ||
              user.name ||
              namesMap[user.uid] ||
              "User";
            if (user.profilePic) {
              avatarsMap[user.uid] = user.profilePic;
            }
          }
        });

        const cachedUsers = await readDataCache(CACHE_KEYS.USERS);
        (cachedUsers || []).forEach((user) => {
          const userId =
            user.Id || user.id || user.uid || user.userId;
          const displayName =
            user.displayName ||
            user.name ||
            user.DisplayName ||
            user.Name;
          const avatar =
            user.profilePic ||
            user.ProfilePicUrl ||
            user.avatar ||
            user.profilePicture ||
            user.imageUrl;
          if (userId && displayName) {
            namesMap[userId] = displayName;
            if (avatar) avatarsMap[userId] = avatar;
          }
        });

        const uniqueStoryUserIds = [
          ...new Set(activeStories.map((s) => s.userId).filter(Boolean)),
        ];

        uniqueStoryUserIds.forEach((userId) => {
          if (!namesMap[userId] && userId !== currentUserId) {
            namesMap[userId] = `User ${userId.substring(0, 6)}`;
          }
        });

        setUserNamesMap(namesMap);
        setUserAvatarsMap(avatarsMap);
      } catch (error) {
        console.error("Error building user maps:", error);
      } finally {
        setLoadingNames(false);
      }
    };

    buildUserMaps();
  }, [
    activeStories,
    baseUserList,
    userMap,
    currentUserId,
    translations.me,
    currentUser,
  ]);

  const getUnreadCount = useCallback(
    (chatId) => {
      const chatMessages = filterMessagesForChat(
        chatId,
        conversations[chatId] || []
      );

      const unreadMessages = chatMessages.filter((msg) => {
        const isReceiver =
          normalizeId(msg.receiver) ===
          normalizeId(currentUserId);

        const isNotRead =
          !msg.read && msg.status !== "read";

        const isNotFromCurrentUser =
          normalizeId(msg.sender) !==
          normalizeId(currentUserId);

        return (
          isReceiver &&
          isNotRead &&
          isNotFromCurrentUser
        );
      });

      return unreadMessages.length;
    },
    [conversations, currentUserId, filterMessagesForChat]
  );

  const chatList = React.useMemo(() => {
    if (!currentUser || baseUserList.length === 0) {
      return [];
    }

    const updatedUsers = baseUserList.map((user) => {
      const chatId = buildDirectKey(
        currentUserId,
        user.uid
      );

      const chatData = filterMessagesForChat(
        chatId,
        conversations[chatId] || []
      );

      const lastMsg = chatData[chatData.length - 1];
      const previewLabels = {
        startConversation: translations.startConversation,
        fileSent: translations.fileSent,
      };

      const unreadCount = getUnreadCount(chatId);

      return {
        ...user,
        lastMessage: formatMessagePreview(lastMsg, previewLabels),
        lastMessageTimestamp: lastMsg?.timestamp ?? lastMessages[chatId],
        unreadCount,
      };
    });

    return updatedUsers.sort((a, b) => {
      const timeA =
        a.lastMessageTimestamp?.toDate?.() || 0;

      const timeB =
        b.lastMessageTimestamp?.toDate?.() || 0;

      return timeB - timeA;
    });
  }, [
    baseUserList,
    conversations,
    lastMessages,
    hiddenMessagesByChat,
    currentUser,
    translations.fileSent,
    translations.startConversation,
    getUnreadCount,
    filterMessagesForChat,
  ]);

  const groupChatPreview = React.useMemo(() => {
    const groupMsgs = filterMessagesForChat(
      GLOBAL_GROUP_CHAT_KEY,
      conversations[GLOBAL_GROUP_CHAT_KEY] || []
    );
    const last = groupMsgs[groupMsgs.length - 1];
    return formatMessagePreview(last, {
      startConversation: translations.startConversation,
      fileSent: translations.fileSent,
    });
  }, [
    conversations,
    filterMessagesForChat,
    translations.startConversation,
    translations.fileSent,
  ]);

  const groupedStories = React.useMemo(() => {
    const groups = {};

    if (activeStories && activeStories.length > 0) {
      activeStories.forEach((story) => {
        if (story && story.userId) {
          if (!groups[story.userId]) {
            groups[story.userId] = [];
          }

          groups[story.userId].push(story);
        }
      });
    }

    Object.keys(groups).forEach((userId) => {
      groups[userId] = sortStoriesNewestFirst(groups[userId]);
    });

    return groups;
  }, [activeStories]);

  const storyGroupsOrdered = React.useMemo(
    () =>
      Object.entries(groupedStories).map(([userId, userStories]) => ({
        userId,
        stories: userStories,
      })),
    [groupedStories]
  );

  const getStoryOwnerName = (userId) => {
    if (String(userId) === String(currentUserId)) {
      return translations.me;
    }

    if (userNamesMap[userId]) {
      return userNamesMap[userId];
    }

    if (loadingNames) {
      return "Loading...";
    }

    return translations.unknown;
  };

  const getStoryOwnerAvatar = (userId) => {
    if (String(userId) === String(currentUserId)) {
      return currentUser?.profilePic || "";
    }

    return userAvatarsMap[userId] || "";
  };

  const handleStoryPress = (userId) => {
    if (!groupedStories[userId]) return;
    const idx = storyGroupsOrdered.findIndex(
      (g) => String(g.userId) === String(userId)
    );
    setSelectedStoryGroupIndex(idx >= 0 ? idx : 0);
    setIsStoryViewerVisible(true);
  };

  const promptDeleteChat = (chatKey, displayName) => {
    Alert.alert(translations.deleteChatTitle, translations.deleteChatMessage, [
      {
        text: translations.cancel,
        style: "cancel",
        onPress: () => setChatPendingDeleteKey(null),
      },
      {
        text: translations.ok,
        style: "destructive",
        onPress: async () => {
          setChatPendingDeleteKey(null);
          try {
            await deleteChat(chatKey);
          } catch (error) {
            console.error("Delete chat failed:", error);
            Alert.alert(translations.deleteChatTitle, translations.deleteFailed);
          }
        },
      },
    ]);
  };

  const handleChatLongPress = (item) => {
    const chatKey = buildDirectKey(currentUserId, item.uid || item.id);
    if (!chatKey) {
      console.warn("Long press: missing chat key", {
        currentUserId,
        peerId: item?.uid || item?.id,
      });
      return;
    }
    setChatPendingDeleteKey(chatKey);
  };

  const handleGroupChatLongPress = () => {
    setChatPendingDeleteKey(GLOBAL_GROUP_CHAT_KEY);
  };

  const handleChatPress = async (item) => {
    const chatId = buildDirectKey(
      currentUserId,
      item.uid
    );

    if (chatPendingDeleteKey) {
      if (chatPendingDeleteKey === chatId) {
        setChatPendingDeleteKey(null);
        return;
      }
      setChatPendingDeleteKey(null);
    }

    if (chatId && item.unreadCount > 0) {
      const chatMessages =
        conversations[chatId] || [];

      await markMessagesAsRead(
        chatId,
        chatMessages
      );
    }

    router.push({
      pathname: `/(screens)/chatConversations/${item.uid}`,
      params: {
        userId: item.uid,
        predefinedMessage: " ",
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (refreshStories) {
          await refreshStories();
        }
      };

      refreshData();
    }, [refreshStories])
  );

  const showInitialLoad = loadingChats && !hasLoadedOnce && !loadingTimeout;
  const showLoadError =
    (loadingTimeout && !hasLoadedOnce) ||
    (chatSyncError && !baseUserList.length && hasLoadedOnce);

  if (showInitialLoad || showLoadError) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <FetchState
          loading={showInitialLoad}
          error={
            showLoadError
              ? chatSyncError || translations.networkError
              : null
          }
          onRetry={async () => {
            setLoadingTimeout(false);
            setHasLoadedOnce(false);
            setRefreshing(true);
            try {
              await Promise.all([
                refreshChats?.(),
                refreshStories?.(),
              ]);
              setHasLoadedOnce(true);
              setLoadingTimeout(false);
            } catch (error) {
              console.log("Retry error:", error);
              setLoadingTimeout(true);
            } finally {
              setRefreshing(false);
            }
          }}
          loadingText={translations.loadingChatsText}
          errorText={translations.networkError}
          retryText={translations.tryAgain}
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              router.replace(HOME_ROUTE);
            }
          }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.tertiary,
            },
          ]}
        >
          {translations.chat}
        </Text>
      </View>

      {chatSyncError && baseUserList.length > 0 ? (
        <TouchableOpacity
          style={styles.syncErrorBanner}
          onPress={() => refreshChats?.()}
        >
          <Text style={styles.syncErrorText}>{chatSyncError}</Text>
          <Text style={styles.syncErrorRetry}>{translations.tryAgain}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.statusListContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {currentUser?.role === "cooperative" && (
            <TouchableOpacity
              style={styles.statusItem}
              onPress={() =>
                router.push("/add-story")
              }
            >
              <StoryAvatar
                isAddStory={true}
                size={56}
              />

              <Text
                style={[
                  styles.menuText,
                  typography.small,
                ]}
              >
                {translations.addStory}
              </Text>
            </TouchableOpacity>
          )}

          {Object.entries(groupedStories).map(
            ([userId, stories]) => {
              const displayName =
                getStoryOwnerName(userId);

              const shortName =
                displayName.length > 12
                  ? `${displayName.substring(
                      0,
                      10
                    )}...`
                  : displayName;

              const showNewHighlight =
                hasAnyUnviewedStory(
                  stories,
                  currentUserId
                );

              const ownerAvatar =
                getStoryOwnerAvatar(userId);

              return (
                <TouchableOpacity
                  key={userId}
                  style={styles.statusItem}
                  onPress={() =>
                    handleStoryPress(userId)
                  }
                >
                  <StoryAvatar
                    imageUrl={
                      ownerAvatar ||
                      stories[0]?.imageURL
                    }
                    name={displayName}
                    size={56}
                    showNewHighlight={
                      showNewHighlight
                    }
                  />

                  <Text
                    style={[
                      styles.menuText,
                      typography.small,
                    ]}
                    numberOfLines={1}
                  >
                    {displayName ===
                    "Loading..." ? (
                      <ActivityIndicator
                        size="small"
                        color="#007AFF"
                      />
                    ) : (
                      shortName
                    )}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      <StoryViewer
        storyGroups={storyGroupsOrdered}
        initialGroupIndex={selectedStoryGroupIndex}
        isVisible={isStoryViewerVisible}
        getOwnerName={getStoryOwnerName}
        getOwnerAvatar={getStoryOwnerAvatar}
        onClose={() => {
          setIsStoryViewerVisible(false);
          setSelectedStoryGroupIndex(0);
        }}
        onReply={(story, replyData) => {
          const storyOwnerName =
            getStoryOwnerName(story.userId);

          const storyUser = {
            uid: story.userId,
            displayName: storyOwnerName,
            profilePic:
              getStoryOwnerAvatar(story.userId),
          };

          router.push({
            pathname: `/(screens)/chatConversations/${story.userId}`,
            params: {
              user: JSON.stringify(storyUser),
              predefinedMessage:
                replyData.text,
              storyPreview: JSON.stringify(
                replyData.storyPreview
              ),
            },
          });

          setIsStoryViewerVisible(false);
        }}
      />

      <ChatRow
        style={[
          styles.chatItem,
          {
            backgroundColor: "#8ee4f59c",
          },
        ]}
        selected={chatPendingDeleteKey === GLOBAL_GROUP_CHAT_KEY}
        onLongPress={handleGroupChatLongPress}
        onPress={() => {
          if (chatPendingDeleteKey === GLOBAL_GROUP_CHAT_KEY) {
            setChatPendingDeleteKey(null);
            return;
          }
          if (chatPendingDeleteKey) {
            setChatPendingDeleteKey(null);
          }
          router.push({
            pathname: "/(screens)/group-chat",
            params: {
              id: "group_swazi_cooperators",
              group: JSON.stringify({
                uid: "group_swazi_cooperators",
                displayName: "Swazi Cooparators",
                profilePicture:
                  "https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg",
                isGroup: true,
              }),
            },
          });
        }}
      >
        <AvatarWithInitials
          imageUrl="https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg"
          name="Swazi Cooparators"
          size={48}
        />

        <View style={styles.chatInfo}>
          <Text
            style={[
              styles.username,
              {
                color: colors.tertiary,
              },
            ]}
          >
            Swazi Cooparators
          </Text>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {groupChatPreview}
          </Text>
        </View>

        {chatPendingDeleteKey === GLOBAL_GROUP_CHAT_KEY ? (
          <TouchableOpacity
            style={styles.deleteChatButton}
            onPress={() =>
              promptDeleteChat(GLOBAL_GROUP_CHAT_KEY, "Swazi Cooparators")
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          Number(unreadCounts?.[GLOBAL_GROUP_CHAT_KEY] || 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCounts[GLOBAL_GROUP_CHAT_KEY] > 99
                  ? "99+"
                  : unreadCounts[GLOBAL_GROUP_CHAT_KEY]}
              </Text>
            </View>
          )
        )}
      </ChatRow>

      <FlatList
        data={chatList}
        keyExtractor={(item) =>
          item.uid?.toString()
        }
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);

              try {
                await Promise.all([
                  refreshChats &&
                    refreshChats(),
                  refreshStories &&
                    refreshStories(),
                ]);
              } catch (error) {
                console.log(
                  "Refresh error:",
                  error
                );
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        renderItem={({ item }) => {
          const rowChatKey = buildDirectKey(currentUserId, item.uid);
          const showDelete = chatPendingDeleteKey === rowChatKey;

          return (
          <ChatRow
            style={styles.chatItem}
            selected={showDelete}
            onLongPress={() => handleChatLongPress(item)}
            onPress={() => handleChatPress(item)}
          >
            <AvatarWithInitials
              imageUrl={
                item.profilePic ||
                placeholderAvatar
              }
              name={
                item.displayName ||
                item.name ||
                "User"
              }
              size={48}
            />

            <View style={styles.chatInfo}>
              <Text
                style={[
                  styles.username,
                  {
                    color: colors.tertiary,
                  },
                ]}
              >
                {item.displayName ||
                  item.name ||
                  "User"}
              </Text>

              <Text
                style={styles.lastMessage}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>

            {showDelete ? (
              <TouchableOpacity
                style={styles.deleteChatButton}
                onPress={() =>
                  promptDeleteChat(
                    rowChatKey,
                    item.displayName || item.name
                  )
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            ) : (
              item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )
            )}
          </ChatRow>
          );
        }}
        contentContainerStyle={styles.chatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  header: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    padding: 4,
    marginRight: 4,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },

  statusListContainer: {
    marginVertical: 8,
  },

  statusItem: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 70,
  },

  statusBorder: {
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  statusSeenRing: {
    backgroundColor: "#e2e8f0",
    borderRadius: 30,
  },

  statusInner: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  statusImage: {
    width: "100%",
    height: "100%",
  },

  addStoryBorder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
  },

  addStoryInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8e8e8",
    borderRadius: 28,
  },

  menuText: {
    marginTop: 4,
    fontSize: 11,
    textAlign: "center",
    color: "#333",
    width: 65,
  },

  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  chatItemSelected: {
    backgroundColor: "rgba(255, 59, 48, 0.08)",
  },

  deleteChatButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: {
    borderRadius: 24,
    marginRight: 12,
  },

  initialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#007AFF",
  },

  initialsText: {
    color: "white",
    fontWeight: "bold",
  },

  initialsStoryAvatar: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },

  initialsStoryText: {
    color: "white",
    fontWeight: "bold",
  },

  chatInfo: {
    flex: 1,
  },

  username: {
    fontSize: 16,
    fontWeight: "bold",
  },

  lastMessage: {
    color: "#777",
    fontSize: 14,
  },

  unreadBadge: {
    backgroundColor: "#FF3B30",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  unreadText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loader: {
    width: 50,
    height: 50,
  },
  syncErrorBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff3cd",
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  syncErrorText: {
    fontSize: 13,
    color: "#664d03",
  },
  syncErrorRetry: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
});

export default ChatList;