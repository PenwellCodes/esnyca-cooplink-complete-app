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
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";

const aboutus = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { currentLanguage, t } = useLanguage();

  // Redirect if not authenticated
  if (!loadingAuth && !currentUser) {
    router.replace("/(auth)/sign-in");
  }

  const [aboutus, setaboutus] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const [translations, setTranslations] = useState({
    moreInformation: "More Information",
    facebook: "Facebook",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        moreInformation: await t("More Information"),
        facebook: await t("Facebook"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Fetch about-us cards from backend
  useEffect(() => {
    const fetchaboutus = async () => {
      try {
        const aboutRaw = await apiRequest("/about-us-cards");
        const aboutusData = (aboutRaw || []).map((item) => ({
          id: item.Id || item.id,
          title: item.Title || "",
          description: item.Description || "",
          imageUrl: item.ImageUrl || "",
          facebookUrl: item.FacebookUrl || "",
        }));
        const localized = await Promise.all(
          aboutusData.map(async (entry) => ({
            ...entry,
            title: await t(entry.title || ""),
            description: await t(entry.description || ""),
          }))
        );
        setaboutus(localized);
      } catch (error) {
        console.error("Error fetching aboutus: ", error);
      }
    };

    fetchaboutus();
  }, [currentLanguage, t]);

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
   

      {/* Partner Cards */}
      <FlatList
        data={aboutus}
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
          <Text style={styles.drawerHeading}>{translations.moreInformation}</Text>
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
                  <Text style={styles.facebookText}>{translations.facebook}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

export default aboutus;

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
