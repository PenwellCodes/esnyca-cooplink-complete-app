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
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";
import { useChat } from "../../context/appstate/ChatContext"; // Add this import
import StoryViewer from "../../components/StoryViewer"; // Add this import

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const ChatList = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { stories: activeStories } = useStories();
  const { conversations, lastMessages, getSortedChats } = useChat(); // Add this line
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupMemberCount, setGroupMemberCount] = useState(0);

  // Listener for total group members (all users)
  useEffect(() => {
    const groupQuery = query(collection(db, "users"));
    const unsubscribe = onSnapshot(groupQuery, (snapshot) => {
      setGroupMemberCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, []);

  // Fetch individual chats
  useEffect(() => {
    if (!currentUser) return;

    let usersQuery;
    if (currentUser.role === "cooperative") {
      usersQuery = query(
        collection(db, "users"),
        where("uid", "!=", currentUser.uid)
      );
    } else {
      usersQuery = query(
        collection(db, "users"),
        where("role", "==", "cooperative"),
        where("uid", "!=", currentUser.uid)
      );
    }

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      const updatedUsers = users.map(user => {
        const chatId = currentUser.uid > user.uid
          ? `${currentUser.uid}_${user.uid}`
          : `${user.uid}_${currentUser.uid}`;
          
        const chatData = conversations[chatId] || [];
        const lastMessage = chatData[chatData.length - 1];
        
        // Only count messages that are not read and not from current user
        const unreadCount = chatData.filter(
          msg => !msg.read && msg.sender !== currentUser.uid
        ).length;
        
        return {
          ...user,
          lastMessage: lastMessage?.text || 
            (lastMessage?.fileUrl ? "📂 File sent" : "Start a conversation"),
          lastMessageTimestamp: lastMessages[chatId],
          unreadCount,
        };
      });

      // Sort users based on last message timestamp
      const sortedUsers = updatedUsers.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.toDate?.() || 0;
        const timeB = b.lastMessageTimestamp?.toDate?.() || 0;
        return timeB - timeA;
      });

      setChatList(sortedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, conversations, lastMessages]);

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
        userName: storyUser?.displayName || 'Unknown User'
      });
      setIsStoryViewerVisible(true);
    }
  };

  if (loading) {
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
      name: "Add Story",
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
    displayName: "Swazi Cooparators",
    profilePicture:
      "https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg",
    memberCount: groupMemberCount,
    isGroup: true,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}></View>

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
              <Text style={[styles.menuText, typography.small]}>Add Story</Text>
            </TouchableOpacity>
          )}
          
          {/* Render user story containers with usernames */}
          {Object.entries(groupedStories).map(([userId, stories]) => {
            const storyUser = chatList.find(user => user.uid === userId);
            const displayName = storyUser?.displayName || 'Unknown';
            const shortName = displayName.length > 8 
              ? `${displayName.substring(0, 8)}...` 
              : displayName;

            return (
              <TouchableOpacity
                key={userId}
                style={styles.statusItem}
                onPress={() => handleStoryPress(userId)}
              >
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
            {groupChat.memberCount} members
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
