import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { collection, getDocs, query, where, doc } from "firebase/firestore";
import { useTheme, Portal, Modal, Menu } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/appstate/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { typography, images } from "../../constants"; // Add this import at the top
import { useLanguage } from "../../context/appstate/LanguageContext";

const regions = ["All", "Hhohho", "Manzini", "Shiselweni", "Lubombo"];

const CooperativeUsersScreen = () => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage, t } = useLanguage();
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
    startChatPredefinedMessage:
      "Hello 👋 there , can you share more about your cooperative 🥰",
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
        startChatPredefinedMessage: await t(
          "Hello 👋 there , can you share more about your cooperative 🥰"
        ),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Fetch users based on selected region filter
  const fetchUsers = async () => {
    setLoading(true);
    try {
      let q;
      if (selectedRegion === "All") {
        q = query(collection(db, "users"), where("role", "==", "cooperative"));
      } else {
        q = query(
          collection(db, "users"),
          where("role", "==", "cooperative"),
          where("region", "==", selectedRegion),
        );
      }
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
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
      // Sort users to put highlighted user first
      const sortedUsers = [...users].sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        return 0;
      });
      setUsers(sortedUsers);
    }
  }, [highlightId, users.length]);

  useEffect(() => {
    // If we have a highlightId, scroll to that cooperative
    if (highlightId) {
      const index = users.findIndex((user) => user.id === highlightId);
      if (index !== -1) {
        // Set the region to match the highlighted cooperative
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

  // Open the bottom drawer to show the cooperative's bio
  const openDrawer = (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };
  const startChat = (user) => {
    if (!currentUser) {
      // Encode the return path with the highlight parameter
      const returnTo = encodeURIComponent(
        `/cooperatives?highlightId=${user.id}`,
      );
      router.push(`/(auth)/sign-in?returnTo=${returnTo}`);
      return;
    }

    const predefinedMessage = translations.startChatPredefinedMessage;
    const userId = user.uid || user.id;
    if (!userId) {
      console.warn("Cannot start chat without a valid user id");
      return;
    }
    console.log("startChat userId:", userId, "user:", user);
    try {
      router.push({
        pathname: `/(screens)/chatConversations/${userId}`,
        params: {
          user: JSON.stringify(user),
          predefinedMessage,
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
          backgroundColor: `${colors.primary}10`, // Add slight highlight color
        },
      ]}
    >
      <View style={styles.leftColumn}>
        <Image
          source={{ uri: item.profilePic || images.defaultAvatar }}
          style={styles.profilePic}
          resizeMode="cover"
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar with filter button */}
      <View style={styles.topBar}>
        <View style={[styles.searchContainer, { borderColor: colors.primary }]}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <TextInput
            placeholder={translations.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#777"
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
    </View>
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
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
