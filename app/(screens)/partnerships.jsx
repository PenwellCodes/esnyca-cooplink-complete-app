import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
} from "react-native";
import { useTheme, Portal, Modal } from "react-native-paper";
import { typography } from "../../constants";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";
import {
  CACHE_KEYS,
  readDataCache,
  writeDataCache,
  subscribeNetUsable,
} from "../../utils/dataCache";
import FetchState from "../../components/FetchState";

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
    networkError:
      "We could not load partnerships right now. Please check your internet connection and try again.",
    tryAgain: "Try again",
    loadingPartners: "Loading partnerships...",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setTranslations({
          moreInformation: await t("More Information"),
          facebook: await t("Facebook"),
          networkError: await t(
            "We could not load partnerships right now. Please check your internet connection and try again."
          ),
          tryAgain: await t("Try again"),
          loadingPartners: await t("Loading partnerships..."),
        });
      } catch {
        setTranslations({
          moreInformation: "More Information",
          facebook: "Facebook",
          networkError:
            "We could not load partnerships right now. Please check your internet connection and try again.",
          tryAgain: "Try again",
          loadingPartners: "Loading partnerships...",
        });
      }
    };
    loadTranslations();
  }, [currentLanguage, t]);

  const localizePartners = async (partnersRaw) => {
    const partnersData = (partnersRaw || []).map((item) => ({
      id: item.Id || item.id,
      title: item.Title || "",
      description: item.Description || "",
      imageUrl: item.ImageUrl || "",
      facebookUrl: item.FacebookUrl || "",
    }));
    return Promise.all(
      partnersData.map(async (partner) => ({
        ...partner,
        title: await t(partner.title || ""),
        description: await t(partner.description || ""),
      }))
    );
  };

  const fetchPartners = useCallback(async () => {
    setErrorMessage("");
    setLoading(true);
    const cachedRaw = await readDataCache(CACHE_KEYS.PARTNERS);
    if (Array.isArray(cachedRaw) && cachedRaw.length > 0) {
      try {
        setPartners(await localizePartners(cachedRaw));
        setLoading(false);
      } catch {
        /* continue to network */
      }
    }

    try {
      const partnersRaw = await apiRequest("/partners");
      await writeDataCache(CACHE_KEYS.PARTNERS, partnersRaw);
      setPartners(await localizePartners(partnersRaw));
      setErrorMessage("");
    } catch (error) {
      console.log("Partners fetch failed.");
      if (!Array.isArray(cachedRaw) || cachedRaw.length === 0) {
        setErrorMessage(translations.networkError);
        setPartners([]);
      }
    } finally {
      setLoading(false);
    }
  }, [t, translations.networkError]);

  useEffect(() => {
    fetchPartners();
    const unsubNet = subscribeNetUsable(fetchPartners);
    return unsubNet;
  }, [fetchPartners]);

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
      <FetchState
        loading={loading && partners.length === 0}
        error={errorMessage || null}
        onRetry={fetchPartners}
        loadingText={translations.loadingPartners}
        errorText={errorMessage || translations.networkError}
        retryText={translations.tryAgain}
        color={colors.primary}
      >
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
      </FetchState>
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
