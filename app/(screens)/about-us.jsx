import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SectionList,
  Linking,
} from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";
import { typography } from "../../constants";

// Hardcoded About Us description (can be fetched from Firebase if needed)
const aboutUsText =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

export default function AboutUsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [teamSections, setTeamSections] = useState([]);
  const [showFullAbout, setShowFullAbout] = useState(false);

  // Fetch team members from Firebase
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "meetourteam"));
        const members = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Group members by title (team name)
        const groups = members.reduce((acc, member) => {
          const title = member.title;
          if (!acc[title]) {
            acc[title] = [];
          }
          acc[title].push(member);
          return acc;
        }, {});
        const sections = Object.entries(groups).map(([title, data]) => ({
          title,
          data,
        }));
        setTeamSections(sections);
      } catch (error) {
        console.error("Error fetching team members:", error);
      }
    };
    fetchTeamMembers();
  }, []);

  // Function to get social media icon based on platform
  const getIconName = (platform) => {
    switch (platform.toLowerCase()) {
      case "linked in":
      case "linkedin":
        return "linkedin";
      case "facebook":
        return "facebook";
      case "twitter":
        return "twitter";
      default:
        return "link";
    }
  };

  // Render team member card
  const renderTeamMember = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            typography.robotoBold,
            typography.body,
            { color: colors.tertiary },
          ]}
        >
          {item.name}
        </Text>
        <Text
           style={[
            styles.title,
            typography.robotoLight,
            typography.small,
            { color: colors.tertiary },
          ]}
          numberOfLines={2}
        >
          {item.bio}
        </Text>
        <View style={styles.socialRow}>
          {item.socialmedia.map((sm, index) => (
            <TouchableOpacity
              key={index}
              style={styles.socialIcon}
              onPress={() => {
                const url = sm.url.startsWith("http")
                  ? sm.url
                  : `https://${sm.url}`;
                Linking.openURL(url).catch((err) =>
                  console.error("Failed to open URL:", err),
                );
              }}
            >
              <FontAwesome
                name={getIconName(sm.platform)}
                size={20  }
                color={colors.primary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="About Us" />
      </Appbar.Header>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <SectionList
          sections={teamSections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTeamMember}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {title}
            </Text>
          )}
          ListHeaderComponent={
            <View style={styles.aboutSection}>
              <Text
                style={[
                  styles.title,
                  typography.robotoBold,
                  typography.title,
                  { color: colors.tertiary },
                ]}
              >
                About Us
              </Text>
              <Text
              style={[
                styles.title,
                typography.robotoLight,
                typography.small,
                { color: colors.tertiary },
              ]}
                numberOfLines={showFullAbout ? 0 : 4}
              >
                {aboutUsText}
              </Text>
              {aboutUsText.length > 200 && (
                <Text
                  style={[styles.readMore, { color: colors.primary }]}
                  onPress={() => setShowFullAbout(!showFullAbout)}
                >
                  {showFullAbout ? "Read Less" : "Read More"}
                </Text>
              )}
              <Text
                style={[
                  styles.title,
                  typography.robotoBold,
                  typography.title,
                  { color: colors.tertiary },
                ]}
              >
                Meet the Team
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  aboutSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  readMore: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 18,
  },
  socialRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  socialIcon: {
    marginRight: 12,
  },
});
