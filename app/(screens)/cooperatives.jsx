import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { collection, getDocs, query, where, doc } from "firebase/firestore";
import { useTheme, Portal, Modal, Menu } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/appstate/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { typography, images } from "../../constants"; // Add this import at the top

const regions = ["All", "Hhohho", "Manzini", "Shiselweni", "Lubombo"];

const CooperativeUsersScreen = () => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const highlightId = params.highlightId;
  const [users, setUsers] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [menuVisible, setMenuVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

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
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRegion]);

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

    const predefinedMessage =
      "Hello 👋 there , can you share more about your cooperative 🥰";
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
          <Text style={styles.chatButtonText}> Start Chat</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.address}>{item.physicalAddress}</Text>
        {item.content && (
          <>
            <Text style={styles.contentLabel}>Product/Service:</Text>
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
                {" "}
                Filter
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
          <Text style={styles.drawerTitle}>Cooperative Details</Text>
          <View style={styles.drawerContentContainer}>
            <Text style={styles.drawerLabel}>Name:</Text>
            <Text style={styles.drawerText}>{selectedUser?.displayName}</Text>

            <Text style={styles.drawerLabel}>Product/Service:</Text>
            <Text style={styles.drawerText}>
              {selectedUser?.content ||
                "No product/service information available"}
            </Text>

            <Text style={styles.drawerLabel}>Contact:</Text>
            <Text style={styles.drawerText}>{selectedUser?.phoneNumber}</Text>

            <Text style={styles.drawerLabel}>Location:</Text>
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
    alignItems: "flex-end",
    padding: 16,
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
