import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../constants";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/appstate/AuthContext";
import { useStories } from "../../context/appstate/StoriesContext";

const placeholderAvatar =
  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";

const ChatList = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { stories: activeStories } = useStories(); // Live active stories from Firestore
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    let usersQuery;
    if (currentUser.role === "cooperative") {
      usersQuery = query(
        collection(db, "users"),
        where("uid", "!=", currentUser.uid),
      );
    } else {
      usersQuery = query(
        collection(db, "users"),
        where("role", "==", "cooperative"),
        where("uid", "!=", currentUser.uid),
      );
    }

    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      let users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const updatedUsers = await Promise.all(
        users.map(async (user) => {
          const chatId =
            currentUser.uid > user.uid
              ? `${currentUser.uid}_${user.uid}`
              : `${user.uid}_${currentUser.uid}`;

          const chatQuery = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
          );

          return new Promise((resolve) => {
            onSnapshot(chatQuery, (chatSnapshot) => {
              const lastMessage =
                chatSnapshot.docs.length > 0
                  ? chatSnapshot.docs[0].data()
                  : null;
              const unreadMessages = chatSnapshot.docs.filter(
                (msg) => !msg.data().read,
              ).length;

              resolve({
                ...user,
                lastMessage:
                  lastMessage?.text ||
                  (lastMessage?.fileUrl
                    ? "📎 File sent"
                    : "Start a conversation"),
                lastSender: lastMessage?.sender || null,
                unreadCount: unreadMessages,
              });
            });
          });
        }),
      );

      setChatList(updatedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} />;
  }

  // Build stories array: add "Add Story" first (if applicable) then active stories
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
      name: story.caption || "", // Or replace with the story owner's name if available
      avatar: story.imageURL, // Optionally, use the story creator’s avatar instead
      userId: story.userId,
    });
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.appName,
            typography.robotoBold,
            typography.body,
            { color: colors.tertiary },
          ]}
        >
          Chats
        </Text>
      </View>

      {/* Stories Section */}
      <View style={styles.statusListContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {storiesForDisplay.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.statusItem}
              onPress={() =>
                story.addStory
                  ? router.push("/add-story")
                  : router.push({
                      pathname: "/view-story",
                      params: { storyId: story.id, userId: story.userId },
                    })
              }
            >
              <LinearGradient
                colors={["#a8e0ff", "#8ee3f5"]}
                style={styles.statusBorder}
              >
                <View style={styles.statusInner}>
                  {story.addStory ? (
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  ) : (
                    <Image
                      source={{ uri: story.avatar }}
                      style={styles.statusImage}
                    />
                  )}
                </View>
              </LinearGradient>
              <Text
                style={[
                  styles.menuText,
                  typography.robotoMedium,
                  typography.small,
                  { color: colors.tertiary },
                ]}
              >
                {story.name.length > 8
                  ? story.name.substring(0, 8) + "..."
                  : story.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat List */}
      <FlatList
        data={chatList}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() =>
              router.push({
                pathname: `/(screens)/chatConversations/${item.uid}`,
                params: { user: JSON.stringify(item) },
              })
            }
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

export default ChatList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
});
