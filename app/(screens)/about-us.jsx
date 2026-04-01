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
import { useLanguage } from "../../context/appstate/LanguageContext";

const aboutus = () => {
  const { colors } = useTheme();
  const { currentLanguage, t } = useLanguage();

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

  // Fetch meet our team + mission/vision/story from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamSnap, missionSnap, storySnap] = await Promise.all([
          getDocs(collection(db, "meetourteam")),
          getDocs(collection(db, "missionandvision")),
          getDocs(collection(db, "ourstory")),
        ]);

        const teamData = teamSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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

        const missionDoc = missionSnap.docs[0]?.data() || {};
        // Support various key casings that might come from Firestore
        const rawMission =
          missionDoc.mission ||
            missionDoc.Mission ||
            missionDoc.missionText ||
            missionDoc.description ||
            "";
        const rawVision =
          missionDoc.vision ||
            missionDoc.Vision ||
            missionDoc.visionText ||
            missionDoc.descriptionVision ||
            "";
        setMission(await t(rawMission));
        setVision(await t(rawVision));

        const storyDoc = storySnap.docs[0]?.data() || {};
        const rawStory =
          storyDoc.story ||
            storyDoc.Story ||
            storyDoc["Our Story"] ||
            storyDoc.ourStory ||
            storyDoc.ourstory ||
            storyDoc.description ||
            storyDoc.text ||
            "";
        setOurStory(await t(rawStory));
      } catch (error) {
        console.error("Error fetching meetourteam/mission/ourstory: ", error);
      }
    };

    fetchData();
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
        <Text style={[styles.sectionTitle, { color: colors.error }]}>
          {translations.missionVision}
        </Text>
        {mission ? (
          <Text style={[styles.sectionBody, { color: colors.tertiary }]}>
            {mission}
          </Text>
        ) : null}
        {vision ? (
          <Text style={[styles.sectionBody, { color: colors.tertiary }]}>
            {vision}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.error }]}>
          {translations.ourStory}
        </Text>
        {ourStory ? (
          <Text style={[styles.sectionBody, { color: colors.tertiary }]}>
            {ourStory}
          </Text>
        ) : null}
      </View>

      {/* Meet the Team */}
      <Text
        style={[
          styles.sectionTitle,
          styles.teamHeader,
          { color: colors.error },
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
            <View style={[styles.menuItem, { borderColor: colors.error }]}>
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
                { color: colors.tertiary },
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
          <Text style={[styles.drawerHeading, { color: colors.error }]}>
            {translations.moreInformation}
          </Text>
          {selectedPartner && (
            <>
              <Text style={[styles.drawerTitle, { color: colors.error }]}>
                {selectedPartner.name || selectedPartner.title}
              </Text>
              <Text style={[styles.drawerSubTitle, { color: colors.tertiary }]}>
                {selectedPartner.title}
              </Text>
              <Text style={[styles.drawerDescription, { color: colors.error }]}>
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
                      color={colors.tertiary}
                    />
                    <Text
                      style={[styles.facebookText, { color: colors.tertiary }]}
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
