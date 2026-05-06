import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Portal, Modal, Menu } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/appstate/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { typography, images } from "../../constants";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";
import { useChat } from "../../context/appstate/ChatContext";

const regions = ["All", "Hhohho", "Manzini", "Shiselweni", "Lubombo"];

// Helper function to get user initials
const getUserInitials = (displayName) => {
  if (!displayName || displayName === 'User') return '?';
  const nameParts = displayName.split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
};

// Avatar component that shows image or initials
const AvatarWithInitials = ({ imageUrl, name, size = 90 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getUserInitials(name);
  const initialsSize = size * 0.35;
  
  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.profilePic, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImageError(true)}
        resizeMode="cover"
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
      <Text style={[styles.initialsText, { fontSize: initialsSize }]}>
        {initials}
      </Text>
    </View>
  );
};

const CooperativeUsersScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage, t } = useLanguage();
  const { conversations, refreshChats } = useChat();
  const highlightId = params.highlightId;
  const [users, setUsers] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [menuVisible, setMenuVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  const [translations, setTranslations] = useState({
    searchPlaceholder: "Search cooperatives",
    filter: "Filter",
    startChat: "Start Chat",
    drawerTitle: "Cooperative Details",
    name: "Name",
    productService: "Product/Service",
    contact: "Contact",
    location: "Location",
    noProductService: "No product/service information available",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        searchPlaceholder: await t("Search cooperatives"),
        filter: await t("Filter"),
        startChat: await t("Start Chat"),
        drawerTitle: await t("Cooperative Details"),
        name: await t("Name"),
        productService: await t("Product/Service"),
        contact: await t("Contact"),
        location: await t("Location"),
        noProductService: await t(
          "No product/service information available"
        ),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Fetch users based on selected region filter
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRaw = await apiRequest("/users");
      const data = (usersRaw || [])
        .map((item) => ({
          id: item.Id || item.id,
          uid: item.Id || item.id,
          role: item.Role || item.role,
          displayName: item.DisplayName || "",
          email: item.Email || "",
          physicalAddress: item.PhysicalAddress || "",
          content: item.Content || "",
          phoneNumber: item.PhoneNumber || "",
          region: item.Region || "",
          registrationNumber: item.RegistrationNumber || "",
          profilePic: item.ProfilePicUrl || "",
        }))
        .filter((u) => u.role === "cooperative")
        .filter((u) => selectedRegion === "All" || u.region === selectedRegion);
      const localizedData = await Promise.all(
        data.map(async (user) => ({
          ...user,
          displayName: await t(user.displayName || ""),
          physicalAddress: await t(user.physicalAddress || ""),
          content: await t(user.content || ""),
          region: await t(user.region || ""),
        }))
      );
      setAllUsers(localizedData);
      setUsers(localizedData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRegion, currentLanguage]);

  useEffect(() => {
    if (highlightId && users.length > 0) {
      const sortedUsers = [...users].sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        return 0;
      });
      setUsers(sortedUsers);
    }
  }, [highlightId, users.length]);

  useEffect(() => {
    if (highlightId) {
      const index = users.findIndex((user) => user.id === highlightId);
      if (index !== -1) {
        const user = users[index];
        setSelectedRegion(user.region || "All");
      }
    }
  }, [highlightId]);

  useEffect(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      setUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter((user) => {
      const haystack = [
        user.displayName,
        user.email,
        user.physicalAddress,
        user.content,
        user.phoneNumber,
        user.region,
        user.registrationNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
    setUsers(filtered);
  }, [searchQuery, allUsers]);

  // Check if there's an existing conversation with this user
  const hasExistingConversation = (userId) => {
    if (!currentUser || !conversations) return false;
    
    const currentUserId = currentUser.uid || currentUser.id;
    const chatKey = [currentUserId, userId].sort().join('_');
    const chatMessages = conversations[chatKey] || [];
    
    return chatMessages.length > 0;
  };

  // Open the bottom drawer to show the cooperative's bio
  const openDrawer = (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  // Start chat without default message
  const startChat = (user) => {
    if (!currentUser) {
      const returnTo = encodeURIComponent(
        `/cooperatives?highlightId=${user.id}`,
      );
      router.push(`/(auth)/sign-in?returnTo=${returnTo}`);
      return;
    }

    const userId = user.uid || user.id;
    if (!userId) {
      console.warn("Cannot start chat without a valid user id");
      return;
    }
    
    // Check if there's an existing conversation
    const hasConversation = hasExistingConversation(userId);
    
    console.log("startChat userId:", userId, "user:", user);
    console.log("Has existing conversation:", hasConversation);
    
    try {
      // If there's an existing conversation, don't send a default message
      // Just navigate to the chat screen without a predefined message
      router.push({
        pathname: `/(screens)/chatConversations/${userId}`,
        params: {
          user: JSON.stringify(user),
          // Only send predefinedMessage if there's NO existing conversation
          ...(!hasConversation && { predefinedMessage: "" }),
        },
      });
    } catch (error) {
      console.error("Navigation failed:", error);
    }
  };

  // Render a user card
  const renderUserCard = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.background },
        highlightId === item.id && {
          borderColor: colors.primary,
          borderWidth: 2,
          backgroundColor: `${colors.primary}10`,
        },
      ]}
    >
      <View style={styles.leftColumn}>
        <AvatarWithInitials
          imageUrl={item.profilePic}
          name={item.displayName}
          size={90}
        />
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => startChat(item)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="white" />
          <Text style={styles.chatButtonText}> {translations.startChat}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.address}>{item.physicalAddress}</Text>
        {item.content && (
          <>
            <Text style={styles.contentLabel}>
              {translations.productService}:
            </Text>
            <Text style={styles.content}>{item.content}</Text>
          </>
        )}
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
      </View>
      <View style={styles.rightColumn}>
        <TouchableOpacity
          style={styles.moreIcon}
          onPress={() => openDrawer(item)}
        >
          <MaterialIcons name="more-vert" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      {/* Top bar with filter button */}
      <View style={styles.topBar}>
        <View style={[styles.searchContainer, { borderColor: colors.primary }]}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <TextInput
            placeholder={translations.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={[styles.filterButton, { borderColor: colors.primary }]}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="filter" size={20} color={colors.primary} />
              <Text
                style={[styles.filterButtonText, { color: colors.primary }]}
              >
                {` ${translations.filter}`}
              </Text>
            </TouchableOpacity>
          }
        >
          {regions.map((region) => (
            <Menu.Item
              key={region}
              onPress={() => {
                setSelectedRegion(region);
                setMenuVisible(false);
              }}
              title={region}
            />
          ))}
        </Menu>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Portal>
        <Modal
          visible={drawerVisible}
          onDismiss={() => setDrawerVisible(false)}
          contentContainerStyle={styles.drawerContainer}
        >
          <Text style={styles.drawerTitle}>{translations.drawerTitle}</Text>
          <View style={styles.drawerContentContainer}>
            <Text style={styles.drawerLabel}>{translations.name}:</Text>
            <Text style={styles.drawerText}>{selectedUser?.displayName}</Text>

            <Text style={styles.drawerLabel}>
              {translations.productService}:
            </Text>
            <Text style={styles.drawerText}>
              {selectedUser?.content ||
                translations.noProductService}
            </Text>

            <Text style={styles.drawerLabel}>{translations.contact}:</Text>
            <Text style={styles.drawerText}>{selectedUser?.phoneNumber}</Text>

            <Text style={styles.drawerLabel}>{translations.location}:</Text>
            <Text style={styles.drawerText}>
              {selectedUser?.physicalAddress}
            </Text>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

export default CooperativeUsersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: "stretch",
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: 40,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    borderColor: "#d3d3d3",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  leftColumn: {
    width: 100,
    alignItems: "center",
  },
  profilePic: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  initialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: "#ccc",
  },
  initialsText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 5,
  },
  chatButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  infoColumn: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: "center",
  },
  displayName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    color: "#555",
  },
  address: {
    fontSize: 14,
    color: "#555",
  },
  registrationNumber: {
    fontSize: 14,
    color: "#555",
  },
  phoneNumber: {
    fontSize: 14,
    color: "#555",
  },
  rightColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  moreIcon: {
    padding: 5,
  },
  drawerContainer: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  drawerContent: {
    fontSize: 16,
    color: "#555",
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  content: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  drawerContentContainer: {
    marginTop: 10,
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  drawerText: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },
});