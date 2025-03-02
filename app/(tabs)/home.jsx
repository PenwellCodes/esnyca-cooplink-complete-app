import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar, // Import StatusBar
} from "react-native";
import { useTheme } from "react-native-paper";
import { typography } from "../../constants";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth, loadingAuth } from "../../context/appstate/AuthContext";
import { searchScreensAndDatabase } from "../../utils/searchScreen";
import { useLanguage } from "../../context/appstate/LanguageContext";

const newsHeadlines = [
  "Innovation is key in every aspect of technology",
  "Breaking: New advancements in AI and automation",
  "Tech industry sees major growth this year",
];

const Home = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current; // Animation value for banner text opacity
  const [searchQuery, setSearchQuery] = useState("");

  const [translations, setTranslations] = useState({
    services: "Services",
    aboutUs: "About Us",
    profileUpdates: "Profile Updates",
    cooperatives: "Cooperatives",
    news: "News",
    partnerships: "Partnerships",
    search: "Search",
    appName: "esnyca",
  });

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      const translated = {};
      for (const [key, value] of Object.entries(translations)) {
        translated[key] = await t(value);
      }
      setTranslations(translated);
    };

    loadTranslations();
  }, [t]);

  const fadeOut = () => {
    Animated.timing(textOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setHeadlineIndex((prevIndex) => (prevIndex + 1) % newsHeadlines.length);
      fadeIn();
    });
  };

  const fadeIn = () => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fadeOut();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: translations.services, icon: "shopping-cart", route: "/support" },
    { name: translations.aboutUs, icon: "groups", route: "/about-us" },
    {
      name: translations.profileUpdates,
      icon: "assignment",
      route: "/profile",
    },
    {
      name: translations.cooperatives,
      icon: "business",
      route: "/cooperatives",
    },
    { name: translations.news, icon: "newspaper", route: "/news" },
    {
      name: translations.partnerships,
      icon: "handshake",
      route: "/partnerships",
    },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await searchScreensAndDatabase(searchQuery);
      router.push({
        pathname: "/(screens)/search-results",
        params: {
          searchQuery: searchQuery,
          results: JSON.stringify(results),
        },
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Status Bar */}
      <StatusBar backgroundColor={colors.background} style="light" />

      {/* App Name */}
      <Text
        style={[
          styles.appName,
          typography.robotoBold,
          { color: colors.tertiary, marginTop: 40 },
        ]}
      >
        {translations.appName}
      </Text>

      {/* Banner */}
      <View style={styles.bannerContainer}>
        <Image
          source={{
            uri: "https://img.freepik.com/free-photo/abstract-sale-busioness-background-banner-design-multipurpose_1340-16799.jpg",
          }}
          style={styles.bannerImage}
        />
        <Animated.Text
          style={[
            styles.bannerText,
            typography.robotoBold,
            typography.subtitle,
            { color: colors.primary, opacity: textOpacity },
          ]}
        >
          {newsHeadlines[headlineIndex]}
        </Animated.Text>
      </View>
      {/* Updated Search Box */}
      <View style={[styles.searchContainer, { borderColor: colors.error }]}>
        <TextInput
          placeholder={translations.search}
          style={[styles.searchInput, { color: colors.error }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          placeholderTextColor={colors.error}
        />
        <TouchableOpacity onPress={handleSearch}>
          <Ionicons name="search" size={28} color={colors.primary} />
        </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "left",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
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
