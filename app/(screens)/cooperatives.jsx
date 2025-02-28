import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  useTheme,
  Portal,
  Modal,
  Menu,
  TextInput,
  Button,
} from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../../firebase/firebaseConfig";

const regions = ["All", "Hhohho", "Manzini", "Shiselweni", "Lubombo"];

const CooperativeUsersScreen = () => {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [menuVisible, setMenuVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bio, setBio] = useState("");
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

  // Open the bottom drawer to add/update bio for the selected user
  const openDrawer = (user) => {
    setSelectedUser(user);
    setBio(user.bio || "");
    setDrawerVisible(true);
  };

  // Save/update the bio to Firestore
  const saveBio = async () => {
    if (selectedUser) {
      try {
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, { bio });
        // Update local state
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id ? { ...user, bio } : user,
          ),
        );
      } catch (error) {
        console.error("Error updating bio:", error);
      }
    }
    setDrawerVisible(false);
  };

  // Render a user card
  const renderUserCard = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.profilePic || "https://via.placeholder.com/150" }}
        style={styles.profilePic}
        resizeMode="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.address}>{item.physicalAddress}</Text>
        <Text style={styles.registrationNumber}>{item.registrationNumber}</Text>
        <Text style={styles.registrationNumber}>{item.phoneNumber}</Text>
      </View>
      <TouchableOpacity
        style={styles.moreIcon}
        onPress={() => openDrawer(item)}
      >
        <MaterialIcons name="more-vert" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
          <TextInput
            label="Description"
            value={bio}
            onChangeText={(text) => setBio(text)}
            multiline
            style={styles.textInput}
          />
          <Button mode="contained" onPress={saveBio} style={styles.saveButton}>
            Save
          </Button>
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
    alignItems: "center",
    borderColor: "#d3d3d3",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  infoContainer: {
    flex: 1,
    paddingHorizontal: 10,
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
  textInput: {
    height: 150,
    marginBottom: 10,
  },
  saveButton: {
    alignSelf: "flex-end",
  },
});
