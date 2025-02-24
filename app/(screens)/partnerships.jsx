import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  Linking,
} from "react-native";
import { Appbar, useTheme, Portal, Modal } from "react-native-paper";
import { typography } from "../../constants";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useAuth, loadingAuth } from "../../context/appstate/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const Partnerships = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  // Redirect if not authenticated
  if (!loadingAuth && !currentUser) {
    router.replace("/(auth)/sign-in");
  }

  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  // Fetch partners data from Firestore
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "partners"));
        const partnersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPartners(partnersData);
      } catch (error) {
        console.error("Error fetching partners: ", error);
      }
    };

    fetchPartners();
  }, []);

  const openDrawer = (partner) => {
    setSelectedPartner(partner);
    setIsDrawerVisible(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  const openFacebook = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Appbar Header */}
      <Appbar.Header style={{ backgroundColor: "#2196F3" }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Partnerships" color="white" />
      </Appbar.Header>

      {/* Partner Cards */}
      <FlatList
        data={partners}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={() => openDrawer(item)}
          >
            <View style={[styles.menuItem, { borderColor: colors.error }]}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.partnerImage}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.menuText,
                typography.robotoMedium,
                typography.small,
                { color: colors.tertiary },
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Bottom Drawer for More Information */}
      <Portal>
        <Modal
          visible={isDrawerVisible}
          onDismiss={closeDrawer}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.drawerHeading}>More Information</Text>
          {selectedPartner && (
            <>
              <Text style={styles.drawerTitle}>{selectedPartner.title}</Text>
              <Text style={styles.drawerDescription}>
                {selectedPartner.description}
              </Text>
              {selectedPartner.facebookUrl && (
                <TouchableOpacity
                  style={styles.facebookButton}
                  onPress={() => openFacebook(selectedPartner.facebookUrl)}
                >
                  <FontAwesome
                    name="facebook"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.facebookText}>Facebook</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

export default Partnerships;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flexGrow: 1,
    padding: 16,
  },
  menuItemContainer: {
    flex: 1,
    alignItems: "center",
    margin: 10,
  },
  menuItem: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  menuText: {
    marginTop: 5,
    textAlign: "center",
  },
  partnerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  drawerDescription: {
    fontSize: 14,
    color: "#444",
    marginBottom: 10,
  },
  facebookButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  facebookText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#1877F2",
  },
});
