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

const aboutus = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  // Remove direct navigation and use useEffect instead
  useEffect(() => {
    if (!currentUser) {
      setTimeout(() => {
        router.replace("/(auth)/sign-in");
      }, 0);
    }
  }, [currentUser]);

  const [team, setTeam] = useState([]);
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [ourStory, setOurStory] = useState("");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

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
        setTeam(teamData);

        const missionDoc = missionSnap.docs[0]?.data() || {};
        // Support various key casings that might come from Firestore
        setMission(
          missionDoc.mission ||
            missionDoc.Mission ||
            missionDoc.missionText ||
            missionDoc.description ||
            "",
        );
        setVision(
          missionDoc.vision ||
            missionDoc.Vision ||
            missionDoc.visionText ||
            missionDoc.descriptionVision ||
            "",
        );

        const storyDoc = storySnap.docs[0]?.data() || {};
        setOurStory(
          storyDoc.story ||
            storyDoc.Story ||
            storyDoc["Our Story"] ||
            storyDoc.ourStory ||
            storyDoc.ourstory ||
            storyDoc.description ||
            storyDoc.text ||
            "",
        );
      } catch (error) {
        console.error("Error fetching meetourteam/mission/ourstory: ", error);
      }
    };

    fetchData();
  }, []);

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

  // If still loading auth state, you can optionally show a loading indicator
  if (!currentUser) {
    return null; // Or return a loading spinner
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.error }]}>
          Mission & Vision
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
          Our Story
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
        Meet the Team
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
          contentContainerStyle={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.primary,
              borderTopWidth: 3,
            },
          ]}
        >
          <Text style={[styles.drawerHeading, { color: colors.error }]}>
            More Information
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
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.facebookText, { color: colors.primary }]}
                    >
                      Social Link
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
