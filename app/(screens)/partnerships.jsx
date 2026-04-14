import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme, Portal, Modal } from "react-native-paper";
import { typography } from "../../constants";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";

const Partnerships = () => {
  const { colors } = useTheme();
  const { currentLanguage, t } = useLanguage();

  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [translations, setTranslations] = useState({
    moreInformation: "More Information",
    facebook: "Facebook",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setTranslations({
          moreInformation: await t("More Information"),
          facebook: await t("Facebook"),
        });
      } catch {
        setTranslations({
          moreInformation: "More Information",
          facebook: "Facebook",
        });
      }
    };
    loadTranslations();
  }, [currentLanguage, t]);

  const fetchPartners = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const partnersRaw = await apiRequest("/partners");
      const partnersData = (partnersRaw || []).map((item) => ({
        id: item.Id || item.id,
        title: item.Title || "",
        description: item.Description || "",
        imageUrl: item.ImageUrl || "",
        facebookUrl: item.FacebookUrl || "",
      }));
      const localizedPartners = await Promise.all(
        partnersData.map(async (partner) => ({
          ...partner,
          title: await t(partner.title || ""),
          description: await t(partner.description || ""),
        }))
      );
      setPartners(localizedPartners);
    } catch (error) {
      // Keep user-facing state friendly without showing raw React/Expo error details.
      console.log("Partners fetch failed.");
      setErrorMessage(
        "We could not load partnerships right now. Please check your internet connection and try again."
      );
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [currentLanguage, t]);

  const openDrawer = (partner) => {
    setSelectedPartner(partner);
    setIsDrawerVisible(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  const openFacebook = (url) => {
    if (!url) return;
    const trimmed = String(url).trim();
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    Linking.canOpenURL(normalizedUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Invalid link", "This partner link cannot be opened.");
          return;
        }
        return Linking.openURL(normalizedUrl);
      })
      .catch(() => {
        Alert.alert("Unable to open link", "Please try again later.");
      });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.tertiary }]}>
            Loading partnerships...
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.stateText, { color: colors.tertiary }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            onPress={fetchPartners}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>

          {/* Partner Cards */}
          <FlatList
            data={partners}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContainer}
            ListEmptyComponent={
              <View style={styles.stateContainer}>
                <Text style={[styles.stateText, { color: colors.tertiary }]}>
                  No partnerships available right now.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.menuItemContainer}
                onPress={() => openDrawer(item)}
              >
                <View style={[styles.menuItem, { borderColor: "#000000" }]}>
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
                    { color: "#000000" },
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
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              contentContainerStyle={[
                styles.modalContainer, 
                { backgroundColor: colors.background }
              ]}
            >
              <Text style={[styles.drawerHeading, { color: "#000000" }]}>
                {translations.moreInformation}
              </Text>
              {selectedPartner && (
                <>
                  <Text style={[styles.drawerTitle, { color: "#000000" }]}>
                    {selectedPartner.title}
                  </Text>
                  <Text style={[styles.drawerDescription, { color: "#000000" }]}>
                    {selectedPartner.description}
                  </Text>
                  {selectedPartner.facebookUrl && (
                    <TouchableOpacity
                      style={styles.facebookButton}
                      onPress={() => openFacebook(selectedPartner.facebookUrl)}
                    >
                      <FontAwesome name="facebook" size={24} color="#000000" />
                      <Text style={styles.facebookText}>
                        {translations.facebook}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Modal>
          </Portal>
        </>
      )}
    </View>
  );
};

export default Partnerships;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
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
    color: "#000000",
  },
});
