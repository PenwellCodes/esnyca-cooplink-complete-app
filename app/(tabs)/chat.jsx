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
} from "react-native";
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
import { apiRequest } from "../../utils/api";

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

const getUserInitials = (displayName) => {
  if (!displayName || displayName === 'User') return '?';
  if (displayName === 'Me' || displayName === 'You') return 'U';
  const nameParts = displayName.split(' ');
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
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImageError(true)}
      />
    );
  }
  
  return (
    <View style={[styles.initialsAvatar, { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor: '#007AFF'
    }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
};

const StoryAvatar = ({ imageUrl, name, size = 56, showNewHighlight = false, isAddStory = false }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getUserInitials(name);
  
  if (isAddStory) {
    return (
      <View style={[styles.statusBorder, styles.addStoryBorder, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
        <View style={[styles.statusInner, { width: size, height: size, borderRadius: size / 2 }]}>
          <View style={styles.addStoryInner}>
            <Ionicons name="add-circle" size={size * 0.5} color="#007AFF" />
          </View>
        </View>
      </View>
    );
  }
  
  if (showNewHighlight) {
    return (
      <LinearGradient
        colors={["#a8e0ff", "#8ee3f5"]}
        style={[styles.statusBorder, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}
      >
        <View style={[styles.statusInner, { width: size, height: size, borderRadius: size / 2 }]}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.statusImage, { width: size, height: size, borderRadius: size / 2 }]}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.initialsStoryAvatar, { 
              width: size, 
              height: size, 
              borderRadius: size / 2,
              backgroundColor: '#007AFF'
            }]}>
              <Text style={[styles.initialsStoryText, { fontSize: size * 0.35 }]}>
                {initials}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  }
  
  return (
    <View style={[styles.statusBorder, styles.statusSeenRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <View style={[styles.statusInner, { width: size, height: size, borderRadius: size / 2 }]}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.statusImage, { width: size, height: size, borderRadius: size / 2 }]}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.initialsStoryAvatar, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: '#007AFF'
          }]}>
            <Text style={[styles.initialsStoryText, { fontSize: size * 0.35 }]}>
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
  } = useChat();
  const { currentLanguage, t } = useLanguage();
  
  const [userNamesMap, setUserNamesMap] = useState({});
  const [userAvatarsMap, setUserAvatarsMap] = useState({});
  const [loadingNames, setLoadingNames] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState({ stories: [], userName: '' });
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const lastRefreshRef = useRef(0);
  
  const [translations, setTranslations] = useState({
    chat: "Chat",
    addStory: "Add Story",
    me: "Me",
    unknownUser: "Unknown User",
    unknown: "Unknown",
    startConversation: "Start a conversation",
    fileSent: "📂 File sent",
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
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);
  
  // Set a timeout to force stop loading after 8 seconds
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
    const fetchAllUserInfo = async () => {
      if (!activeStories || activeStories.length === 0) {
        setLoadingNames(false);
        return;
      }
      
      setLoadingNames(true);
      
      try {
        const response = await apiRequest('/users');
        const allUsers = response || [];
        const namesMap = {};
        const avatarsMap = {};
        
        namesMap[currentUserId] = translations.me;
        avatarsMap[currentUserId] = currentUser?.profilePic || '';
        
        allUsers.forEach(user => {
          const userId = user.Id || user.id || user.uid || user.userId;
          const displayName = user.displayName || user.name || user.fullName || user.username || user.userName || user.DisplayName || user.Name;
          const avatar = user.profilePic || user.avatar || user.profilePicture || user.imageUrl;
          if (userId && displayName) {
            namesMap[userId] = displayName;
            if (avatar) avatarsMap[userId] = avatar;
          }
        });
        
        baseUserList.forEach(user => {
          if (user.uid) {
            namesMap[user.uid] = user.displayName || user.name || namesMap[user.uid] || 'User';
            if (user.profilePic) avatarsMap[user.uid] = user.profilePic;
          }
        });
        
        const uniqueStoryUserIds = [...new Set(activeStories.map(s => s.userId).filter(Boolean))];
        uniqueStoryUserIds.forEach(userId => {
          if (!namesMap[userId] && userId !== currentUserId) {
            const shortId = userId.substring(0, 6);
            namesMap[userId] = `User ${shortId}`;
          }
        });
        
        setUserNamesMap(namesMap);
        setUserAvatarsMap(avatarsMap);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingNames(false);
      }
    };
    
    fetchAllUserInfo();
  }, [activeStories, baseUserList, currentUserId, translations.me, currentUser]);
  
  const getUnreadCount = useCallback((chatId) => {
    const chatMessages = conversations[chatId] || [];
    const unreadMessages = chatMessages.filter(msg => {
      const isReceiver = normalizeId(msg.receiver) === normalizeId(currentUserId);
      const isNotRead = !msg.read && msg.status !== 'read';
      const isNotFromCurrentUser = normalizeId(msg.sender) !== normalizeId(currentUserId);
      return isReceiver && isNotRead && isNotFromCurrentUser;
    });
    return unreadMessages.length;
  }, [conversations, currentUserId]);
  
  const chatList = React.useMemo(() => {
    if (!currentUser || baseUserList.length === 0) return [];
    
    const updatedUsers = baseUserList.map(user => {
      const chatId = buildDirectKey(currentUserId, user.uid);
      const chatData = conversations[chatId] || [];
      const lastMessage = chatData[chatData.length - 1];
      const unreadCount = getUnreadCount(chatId);
      
      return {
        ...user,
        lastMessage: lastMessage?.type === "story_reply"
          ? `Replied to status: ${lastMessage?.text || ""}`.trim()
          : lastMessage?.text || (lastMessage?.fileUrl ? translations.fileSent : translations.startConversation),
        lastMessageTimestamp: lastMessages[chatId],
        unreadCount,
      };
    });

    return updatedUsers.sort((a, b) => {
      const timeA = a.lastMessageTimestamp?.toDate?.() || 0;
      const timeB = b.lastMessageTimestamp?.toDate?.() || 0;
      return timeB - timeA;
    });
  }, [baseUserList, conversations, lastMessages, currentUser, translations.fileSent, translations.startConversation, getUnreadCount]);

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
    return groups;
  }, [activeStories]);

  const getStoryOwnerName = (userId) => {
    if (String(userId) === String(currentUserId)) {
      return translations.me;
    }
    if (userNamesMap[userId]) {
      return userNamesMap[userId];
    }
    if (loadingNames) {
      return 'Loading...';
    }
    return translations.unknown;
  };

  const getStoryOwnerAvatar = (userId) => {
    if (String(userId) === String(currentUserId)) {
      return currentUser?.profilePic || '';
    }
    return userAvatarsMap[userId] || '';
  };

  const handleStoryPress = (userId) => {
    if (groupedStories[userId]) {
      const ownerName = getStoryOwnerName(userId);
      setSelectedUserStories({
        stories: groupedStories[userId],
        userName: ownerName,
      });
      setIsStoryViewerVisible(true);
    }
  };

  const handleChatPress = async (item) => {
    const chatId = buildDirectKey(currentUserId, item.uid);
    
    if (chatId && item.unreadCount > 0) {
      const chatMessages = conversations[chatId] || [];
      await markMessagesAsRead(chatId, chatMessages);
    }
    
    router.push({
      pathname: `/(screens)/chatConversations/${item.uid}`,
      params: {
        userId: item.uid,
        predefinedMessage: " ",
      },
    });
  };

  // Refresh on focus
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

  // Show loading with timeout fallback
  if (loadingChats && !hasLoadedOnce && !loadingTimeout) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Image source={images.loader} style={styles.loader} />
        <Text style={{ marginTop: 10, color: colors.tertiary }}>Loading chats...</Text>
      </View>
    );
  }

  // Show timeout error with retry
  if (loadingTimeout && !hasLoadedOnce) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="chatbubbles-outline" size={60} color={colors.primary} />
        <Text style={{ marginTop: 15, color: colors.tertiary, textAlign: 'center', paddingHorizontal: 30 }}>
          Unable to load chats. Check your internet connection.
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 }}
          onPress={async () => {
            setLoadingTimeout(false);
            setHasLoadedOnce(false);
            setRefreshing(true);
            try {
              await Promise.all([
                refreshChats && refreshChats(),
                refreshStories && refreshStories()
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
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              router.replace("/(tabs)/home");
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.tertiary }]}>
          {translations.chat}
        </Text>
      </View>

      <View style={styles.statusListContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {currentUser?.role === "cooperative" && (
            <TouchableOpacity
              style={styles.statusItem}
              onPress={() => router.push("/add-story")}
            >
              <StoryAvatar 
                isAddStory={true}
                size={56}
              />
              <Text style={[styles.menuText, typography.small]}>
                {translations.addStory}
              </Text>
            </TouchableOpacity>
          )}
          
          {Object.entries(groupedStories).map(([userId, stories]) => {
            const displayName = getStoryOwnerName(userId);
            const shortName = displayName.length > 12 ? `${displayName.substring(0, 10)}...` : displayName;
            const showNewHighlight = hasAnyUnviewedStory(stories, currentUserId);
            const ownerAvatar = getStoryOwnerAvatar(userId);

            return (
              <TouchableOpacity
                key={userId}
                style={styles.statusItem}
                onPress={() => handleStoryPress(userId)}
              >
                <StoryAvatar 
                  imageUrl={ownerAvatar || stories[0]?.imageURL}
                  name={displayName}
                  size={56}
                  showNewHighlight={showNewHighlight}
                />
                <Text style={[styles.menuText, typography.small]} numberOfLines={1}>
                  {displayName === 'Loading...' ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    shortName
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <StoryViewer
        stories={selectedUserStories.stories}
        isVisible={isStoryViewerVisible}
        onClose={() => {
          setIsStoryViewerVisible(false);
          setSelectedUserStories({ stories: [], userName: '' });
        }}
        onReply={(story, replyData) => {
          const storyOwnerName = getStoryOwnerName(story.userId);
          const storyUser = {
            uid: story.userId,
            displayName: storyOwnerName,
            profilePic: getStoryOwnerAvatar(story.userId),
          };
          
          router.push({
            pathname: `/(screens)/chatConversations/${story.userId}`,
            params: {
              user: JSON.stringify(storyUser),
              predefinedMessage: replyData.text,
              storyPreview: JSON.stringify(replyData.storyPreview)
            },
          });
          setIsStoryViewerVisible(false);
        }}
      />

      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: "#8ee4f59c" }]}
        onPress={() =>
          router.push({
            pathname: "/(screens)/group-chat",
            params: {
              id: "group_swazi_cooperators",
              group: JSON.stringify({
                uid: "group_swazi_cooperators",
                displayName: "Swazi Cooparators",
                profilePicture: "https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg",
                isGroup: true,
              }),
            },
          })
        }
      >
        <AvatarWithInitials
          imageUrl="https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg"
          name="Swazi Cooparators"
          size={48}
        />
        <View style={styles.chatInfo}>
          <Text style={[styles.username, { color: colors.tertiary }]}>
            Swazi Cooparators
          </Text>
          <Text style={styles.lastMessage}>Group chat</Text>
        </View>
        {Number(unreadCounts?.[GLOBAL_GROUP_CHAT_KEY] || 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {unreadCounts[GLOBAL_GROUP_CHAT_KEY] > 99 ? '99+' : unreadCounts[GLOBAL_GROUP_CHAT_KEY]}
            </Text>
          </View>
        )}
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.chatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  header: { paddingHorizontal: 8, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  backButton: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  statusListContainer: { marginVertical: 8 },
  statusItem: { alignItems: "center", marginHorizontal: 8, width: 70 },
  statusBorder: { padding: 2, alignItems: "center", justifyContent: "center" },
  statusSeenRing: { backgroundColor: "#e2e8f0", borderRadius: 30 },
  statusInner: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  statusImage: { width: "100%", height: "100%" },
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
  menuText: { marginTop: 4, fontSize: 11, textAlign: "center", color: "#333", width: 65 },
  chatList: { paddingHorizontal: 16, paddingBottom: 16 },
  chatItem: { flexDirection: "row", alignItems: "center", marginVertical: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  avatar: { borderRadius: 24, marginRight: 12 },
  initialsAvatar: { justifyContent: "center", alignItems: "center", marginRight: 12, backgroundColor: '#007AFF' },
  initialsText: { color: 'white', fontWeight: 'bold' },
  initialsStoryAvatar: { justifyContent: "center", alignItems: "center", backgroundColor: '#007AFF' },
  initialsStoryText: { color: 'white', fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: "bold" },
  lastMessage: { color: "#777", fontSize: 14 },
  unreadBadge: { backgroundColor: "#FF3B30", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadText: { color: "white", fontSize: 11, fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loader: { width: 50, height: 50 },
});

export default ChatList;