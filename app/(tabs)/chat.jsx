import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { typography, images } from "../../constants";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";
import { useChat } from "../../context/appstate/ChatContext"; // Add this import
import StoryViewer from "../../components/StoryViewer"; // Add this import
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../../context/appstate/LanguageContext";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

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

const ChatList = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const { stories: activeStories } = useStories();
  const { chatList: baseUserList, conversations, lastMessages, loadingChats } =
    useChat();
  const { currentLanguage, t } = useLanguage();
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [translations, setTranslations] = useState({
    chat: "Chat",
    addStory: "Add Story",
    unknownUser: "Unknown User",
    unknown: "Unknown",
    members: "members",
    groupName: "Swazi Cooparators",
    startConversation: "Start a conversation",
    fileSent: "📂 File sent",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        chat: await t("Chat"),
        addStory: await t("Add Story"),
        unknownUser: await t("Unknown User"),
        unknown: await t("Unknown"),
        members: await t("members"),
        groupName: await t("Swazi Cooparators"),
        startConversation: await t("Start a conversation"),
        fileSent: await t("📂 File sent"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);
  
  // Compute chat list from base users and conversations/lastMessages using useMemo
  const chatList = React.useMemo(() => {
    if (!currentUser || baseUserList.length === 0) return [];
    
    const updatedUsers = baseUserList.map(user => {
      const chatId = currentUser.uid > user.uid
        ? `${currentUser.uid}_${user.uid}`
        : `${user.uid}_${currentUser.uid}`;
        
      const chatData = conversations[chatId] || [];
      const lastMessage = chatData[chatData.length - 1];
      
      const unreadCount = chatData.filter(
        msg => !msg.read && msg.sender !== currentUser.uid
      ).length;
      
      return {
        ...user,
        lastMessage: lastMessage?.text || 
          (lastMessage?.fileUrl
            ? translations.fileSent
            : translations.startConversation),
        lastMessageTimestamp: lastMessages[chatId],
        unreadCount,
      };
    });

    return updatedUsers.sort((a, b) => {
      const timeA = a.lastMessageTimestamp?.toDate?.() || 0;
      const timeB = b.lastMessageTimestamp?.toDate?.() || 0;
      return timeB - timeA;
    });
  }, [
    baseUserList,
    conversations,
    lastMessages,
    currentUser,
    translations.fileSent,
    translations.startConversation,
  ]);

  useEffect(() => {
    setGroupMemberCount(baseUserList.length + 1);
  }, [baseUserList.length]);

  // Group stories by user
  const groupedStories = React.useMemo(() => {
    const groups = {};
    activeStories.forEach((story) => {
      if (!groups[story.userId]) {
        groups[story.userId] = [];
      }
      groups[story.userId].push(story);
    });
    return groups;
  }, [activeStories]);

  const [selectedUserStories, setSelectedUserStories] = useState({
    stories: [],
    userName: ''
  });

  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);

  const handleStoryPress = (userId) => {
    if (groupedStories[userId]) {
      const storyUser = chatList.find(user => user.uid === userId);
      setSelectedUserStories({
        stories: groupedStories[userId],
        userName: storyUser?.displayName || translations.unknownUser,
      });
      setIsStoryViewerVisible(true);
    }
  };

  if (loadingChats) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Image source={images.loader} style={styles.loader} />
      </View>
    );
  }

  // Build stories array
  const storiesForDisplay = [];
  if (currentUser?.role === "cooperative") {
    storiesForDisplay.push({
      id: "add-story",
      name: translations.addStory,
      addStory: true,
      avatar: currentUser.profilePic || placeholderAvatar,
    });
  }
  activeStories.forEach((story) => {
    storiesForDisplay.push({
      id: story.id,
      name: story.caption || "",
      avatar: story.imageURL,
      userId: story.userId,
    });
  });

  // Define the group chat object
  const groupChat = {
    uid: "group_swazi_cooperators",
    displayName: translations.groupName,
    profilePicture:
      "https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg",
    memberCount: groupMemberCount,
    isGroup: true,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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

      {/* Stories Section */}
      <View style={styles.statusListContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {currentUser?.role === "cooperative" && (
            <TouchableOpacity
              style={styles.statusItem}
              onPress={() => router.push("/add-story")}
            >
              <LinearGradient
                colors={["#a8e0ff", "#8ee3f5"]}
                style={styles.statusBorder}
              >
                <View style={styles.statusInner}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </View>
              </LinearGradient>
              <Text style={[styles.menuText, typography.small]}>
                {translations.addStory}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Render user story containers with usernames */}
          {Object.entries(groupedStories).map(([userId, stories]) => {
            const storyUser = chatList.find(user => user.uid === userId);
            const displayName = storyUser?.displayName || translations.unknown;
            const shortName = displayName.length > 8 
              ? `${displayName.substring(0, 8)}...` 
              : displayName;

            const showNewHighlight = hasAnyUnviewedStory(
              stories,
              currentUser?.uid
            );

            return (
              <TouchableOpacity
                key={userId}
                style={styles.statusItem}
                onPress={() => handleStoryPress(userId)}
              >
                {showNewHighlight ? (
                  <LinearGradient
                    colors={["#a8e0ff", "#8ee3f5"]}
                    style={styles.statusBorder}
                  >
                    <View style={styles.statusInner}>
                      <Image
                        source={{ uri: stories[0].imageURL }}
                        style={styles.statusImage}
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.statusBorder, styles.statusSeenRing]}>
                    <View style={styles.statusInner}>
                      <Image
                        source={{ uri: stories[0].imageURL }}
                        style={styles.statusImage}
                      />
                    </View>
                  </View>
                )}
                <Text style={[styles.menuText, typography.small]}>
                  {shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Story Viewer Modal */}
      <StoryViewer
        stories={selectedUserStories.stories}
        isVisible={isStoryViewerVisible}
        userName={selectedUserStories.userName}
        onClose={() => {
          setIsStoryViewerVisible(false);
          setSelectedUserStories({ stories: [], userName: '' });
        }}
        onReply={(story, replyData) => {
          const storyUser = chatList.find(user => user.uid === story.userId);
          if (storyUser) {
            router.push({
              pathname: `/(screens)/chatConversations/${story.userId}`,
              params: {
                user: JSON.stringify(storyUser),
                predefinedMessage: replyData.text,
                storyPreview: JSON.stringify(replyData.storyPreview)
              },
            });
          }
          setIsStoryViewerVisible(false);
        }}
      />

      {/* Group Chat Item */}
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: "#8ee4f59c" }]}
        onPress={() => {
          router.push({
            pathname: "/(screens)/group-chat",
            params: { id: groupChat.uid, group: JSON.stringify(groupChat) },
          })
        }}
      >
        <Image
          source={{ uri: groupChat.profilePicture }}
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <Text style={[styles.username, { color: colors.tertiary }]}>
            {groupChat.displayName}
          </Text>
          <Text style={styles.lastMessage}>
            {groupChat.memberCount} {translations.members}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Individual Chat List */}
      <FlatList
        data={chatList}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => {
              router.push({
                pathname: `/(screens)/chatConversations/${item.uid}`,
                params: {
                  user: JSON.stringify(item),
                  predefinedMessage:
                    " ",
                },
              })
            }}
          >
            <Image
              source={{ uri: item.profilePic || placeholderAvatar }}
              style={styles.avatar}
            />
            <View style={styles.chatInfo}>
              <Text style={[styles.username, { color: colors.tertiary }]}>
                {item.displayName}
              </Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
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
  appName: {
    fontSize: 20,
  },
  statusListContainer: {
    marginVertical: 8,
  },
  statusItem: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  statusBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSeenRing: {
    backgroundColor: "#e2e8f0",
  },
  statusInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  statusImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  menuText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    color: "#333", // Add this to ensure text visibility
    width: 60, // Add this to ensure consistent width
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
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
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
    backgroundColor: "red",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 12,
  },
  // Loader styles added
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    width: 50,
    height: 50,
  },
});

export default ChatList;
