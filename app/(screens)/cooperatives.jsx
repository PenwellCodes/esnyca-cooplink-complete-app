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
import { useRouter } from "expo-router";

const regions = ["All", "Hhohho", "Manzini", "Shiselweni", "Lubombo"];

const CooperativeUsersScreen = () => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const router = useRouter();
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

  // Open the bottom drawer to show the cooperative's bio
  const openDrawer = (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };
  const startChat = (user) => {
    const predefinedMessage =
      "Hello 👋 there , can you share more about your cooperative 🥰";
    router.push({
      pathname: `/(screens)/chatConversations/${user.uid}`,
      params: {
        user: JSON.stringify(user),
        predefinedMessage, 
      },
    });
  };
  // Render a user card
  const renderUserCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.leftColumn}>
        <Image
          source={{ uri: item.profilePic || "https://via.placeholder.com/150" }}
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
        <Text style={styles.registrationNumber}>{item.registrationNumber}</Text>
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
              style={styles.filterButton}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="filter" size={20} color="black" />
              <Text style={styles.filterButtonText}> Filter</Text>
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
          <Text style={styles.drawerTitle}>Cooperative Bio</Text>
          <Text style={styles.drawerContent}>
            {selectedUser && selectedUser.bio
              ? selectedUser.bio
              : "This cooperative has not updated its information yet."}
          </Text>
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
    borderColor: "#d3d3d3",
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
    backgroundColor: "white",
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
});
