import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated, // Added for animations
} from "react-native";
import { useTheme, Snackbar } from "react-native-paper";
import { typography } from "../../constants";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth, loadingAuth } from "../../context/appstate/AuthContext";

const newsHeadlines = [
  "Innovation is key in every aspect of technology",
  "Breaking: New advancements in AI and automation",
  "Tech industry sees major growth this year",
];

const Home = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current; // Animation value for banner text opacity

  // Fade out animation: fades to 0, updates text, then triggers fade in
  const fadeOut = () => {
    Animated.timing(textOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true, // Improves performance
    }).start(() => {
      setHeadlineIndex((prevIndex) => (prevIndex + 1) % newsHeadlines.length);
      fadeIn();
    });
  };

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace("/(auth)/sign-in");
    }
  }, [currentUser, loadingAuth]);

  // Fade in animation: fades back to 1
  const fadeIn = () => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Set up interval to trigger fadeOut every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fadeOut();
    }, 5000); // Increased from 3000ms to 5000ms
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  const menuItems = [
    { name: "Services", icon: "shopping-cart", route: "/services" },
    { name: "About Us", icon: "groups", route: "/about-us" },
    { name: "Profile Updates", icon: "assignment", route: "/profile" },
    { name: "Cooperatives", icon: "business", route: "/cooperatives" },
    { name: "News", icon: "newspaper", route: "/news" },
    {
      name: "Partnerships",
      icon: "handshake",
      route: "/(screens)/partnerships",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App Name */}
      <Text
        style={[
          styles.appName,
          typography.robotoBold,
          { color: colors.tertiary, marginTop: 40 }, // Added marginTop to prevent cutting off
        ]}
      >
        esnyca
      </Text>

      {/* Banner */}
      <View style={styles.bannerContainer}>
        <Image
          source={{
            uri: "https://img.freepik.com/free-photo/abstract-sale-busioness-background-banner-design-multipurpose_1340-16799.jpg?t=st=1740240735~exp=1740244335~hmac=3162a76b4e61a3236163de05ce8f13396ae0ded3fbd398e29b166dfa8f489e23&w=1480",
          }}
          style={styles.bannerImage}
        />
        <Text
          style={[
            styles.bannerText,
            styles.menuText,
            typography.robotoBold,
            typography.subtitle,
            { color: colors.background },
          ]}
        >
          {newsHeadlines[headlineIndex]}
        </Text>
      </View>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <TextInput placeholder="Search" style={styles.searchInput} />
        <Ionicons name="search" size={28} color={colors.primary} />
      </View>

      {/* Menu Items */}
      <FlatList
        data={menuItems}
        numColumns={3}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={() => router.push(item.route)}
          >
            <View style={[styles.menuItem, { borderColor: colors.error }]}>
              <MaterialIcons
                name={item.icon}
                size={40}
                color={colors.primary}
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
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  appName: {
    alignSelf: "flex-start",
    fontSize: 28,
    marginTop: 20,
  },
  bannerContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: 200,
  },
  bannerText: {
    position: "absolute",
    left: 10,
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }],
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "left",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C1B8C8",
    height: 60,
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  flatListContainer: {
    flexGrow: 1,
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
});
