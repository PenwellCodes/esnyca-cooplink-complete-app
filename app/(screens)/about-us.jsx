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
import { useTheme, Portal, Modal } from "react-native-paper";
import { typography } from "../../constants";
import { FontAwesome } from "@expo/vector-icons";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";

const aboutus = () => {
  const { colors } = useTheme();
  const { currentLanguage, t } = useLanguage();
  const HARD_CODED_MISSION =
    "To empower youth cooperatives in Eswatini through inclusive support, capacity building, and strategic partnerships that drive sustainable economic growth.";
  const HARD_CODED_VISION =
    "To be the leading platform that connects, strengthens, and transforms youth cooperatives into resilient and innovative enterprises.";
  const HARD_CODED_STORY =
    "ESNYCA was established to support and unify youth cooperatives by providing guidance, market access, and opportunities for collaboration. Through this platform, cooperatives can showcase their work, connect with partners, and grow their impact in communities.";

  const [team, setTeam] = useState([]);
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [ourStory, setOurStory] = useState("");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const [translations, setTranslations] = useState({
    missionVision: "Mission & Vision",
    ourStory: "Our Story",
    meetTeam: "Meet the Team",
    moreInformation: "More Information",
    socialLink: "Social Link",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        missionVision: await t("Mission & Vision"),
        ourStory: await t("Our Story"),
        meetTeam: await t("Meet the Team"),
        moreInformation: await t("More Information"),
        socialLink: await t("Social Link"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  // Fetch team from backend.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamRaw = await apiRequest("/team-members");

        const teamData = (teamRaw || []).map((item) => ({
          id: item.Id || item.id,
          name: item.Name || "",
          title: item.Title || "",
          description: item.Description || "",
          bio: item.Bio || "",
          image: item.ImageUrl || "",
          socialmedia: [],
        }));
        const localizedTeam = await Promise.all(
          teamData.map(async (member) => ({
            ...member,
            name: await t(member.name || ""),
            title: await t(member.title || ""),
            description: await t(member.description || ""),
            bio: await t(member.bio || ""),
          }))
        );
        setTeam(localizedTeam);
      } catch (error) {
        console.error("Error fetching meetourteam: ", error);
      }
    };

    fetchData();
  }, [currentLanguage, t]);

  useEffect(() => {
    const setHardcodedContent = async () => {
      setMission(await t(HARD_CODED_MISSION));
      setVision(await t(HARD_CODED_VISION));
      setOurStory(await t(HARD_CODED_STORY));
    };
    setHardcodedContent();
  }, [currentLanguage, t]);

  const openDrawer = (partner) => {
    setSelectedPartner(partner);
    setIsDrawerVisible(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: "#000000" }]}>
          {translations.missionVision}
        </Text>
        {mission ? (
          <Text style={[styles.sectionBody, { color: "#000000" }]}>
            {mission}
          </Text>
        ) : null}
        {vision ? (
          <Text style={[styles.sectionBody, { color: "#000000" }]}>
            {vision}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: "#000000" }]}>
          {translations.ourStory}
        </Text>
        {ourStory ? (
          <Text style={[styles.sectionBody, { color: "#000000" }]}>
            {ourStory}
          </Text>
        ) : null}
      </View>

      {/* Meet the Team */}
      <Text
        style={[
          styles.sectionTitle,
          styles.teamHeader,
          { color: "#000000" },
        ]}
      >
        {translations.meetTeam}
      </Text>
      <FlatList
        data={team}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={() => openDrawer(item)}
          >
            <View style={[styles.menuItem, { borderColor: "#000000" }]}>
              <Image
                source={{ uri: item.image }}
                style={styles.partnerImage}
                resizeMode="cover"
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
              {item.name || item.title}
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
            {
              backgroundColor: colors.background,
              borderTopColor: colors.tertiary,
              borderTopWidth: 3,
            },
          ]}
        >
          <Text style={[styles.drawerHeading, { color: "#000000" }]}>
            {translations.moreInformation}
          </Text>
          {selectedPartner && (
            <>
              <Text style={[styles.drawerTitle, { color: "#000000" }]}>
                {selectedPartner.name || selectedPartner.title}
              </Text>
              <Text style={[styles.drawerSubTitle, { color: "#000000" }]}>
                {selectedPartner.title}
              </Text>
              <Text style={[styles.drawerDescription, { color: "#000000" }]}>
                {selectedPartner.description || selectedPartner.bio}
              </Text>
              {Array.isArray(selectedPartner.socialmedia) &&
                selectedPartner.socialmedia.map((url, index) => (
                  <TouchableOpacity
                    key={`${selectedPartner.id}-social-${index}`}
                    style={styles.facebookButton}
                    onPress={() => openLink(url)}
                  >
                    <FontAwesome
                      name="facebook"
                      size={24}
                      color="#000000"
                    />
                    <Text
                      style={[styles.facebookText, { color: "#000000" }]}
                    >
                      {translations.socialLink}
                    </Text>
                  </TouchableOpacity>
                ))}
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  teamHeader: {
    marginTop: 16,
    paddingHorizontal: 16,
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
  drawerSubTitle: {
    fontSize: 14,
    marginBottom: 6,
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
  },
});
