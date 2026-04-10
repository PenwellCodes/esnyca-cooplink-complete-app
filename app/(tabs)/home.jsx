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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../../utils/api";

const Home = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current; // Animation value for banner text opacity
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUnreadNews, setHasUnreadNews] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState([
    "Welcome to ESNYCA",
    "Stay updated with the latest news",
    "Connecting cooperatives together",
  ]); // Default headlines until news is loaded

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
      setHeadlineIndex((prevIndex) => {
        if (newsHeadlines.length === 0) return 0;
        return (prevIndex + 1) % newsHeadlines.length;
      });
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
    // Only start animation if we have headlines
    if (newsHeadlines.length === 0) return;

    const interval = setInterval(() => {
      fadeOut();
    }, 5000);
    return () => clearInterval(interval);
  }, [newsHeadlines.length]);

  useEffect(() => {
    const fetchNewsData = async () => {
      try {
        const lastReadTime =
          (await AsyncStorage.getItem("lastNewsReadTime")) || "0";
        const publishedNews = await apiRequest("/news?published=true");

        if (publishedNews.length > 0) {
          // Extract titles from published news
          const headlines = publishedNews
            .map((news) => news.Title || news.title)
            .filter((title) => title && title.trim() !== ""); // Filter out empty titles

          if (headlines.length > 0) {
            setNewsHeadlines(headlines);
          }

          // Check for unread news using the first published item
          const latestNews = publishedNews[0];
          const newsDate = latestNews.CreatedAt || latestNews.createdAt;

          let newsTimestamp = 0;
          if (newsDate) {
            newsTimestamp = new Date(newsDate).getTime();
          }

          setHasUnreadNews(newsTimestamp > parseInt(lastReadTime));
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };

    fetchNewsData();
  }, []);

  const handleNewsPress = async () => {
    await AsyncStorage.setItem("lastNewsReadTime", Date.now().toString());
    setHasUnreadNews(false);
    router.push("/(screens)/news");
  };

  const handleProfilePress = () => {
    if (!currentUser) {
      const returnTo = encodeURIComponent("/(screens)/profile");
      router.push(`/(auth)/sign-in?returnTo=${returnTo}`);
      return;
    }
    router.push("/(screens)/profile");
  };

  const menuItems = [
    { name: translations.services, icon: "shopping-cart", route: "/support" },
    { name: translations.aboutUs, icon: "groups", route: "/about-us" },
    {
      name: translations.profileUpdates,
      icon: "assignment",
      onPress: handleProfilePress,
    },
    {
      name: translations.cooperatives,
      icon: "business",
      route: "/cooperatives",
    },
    {
      name: translations.news,
      icon: "newspaper",
      route: "/news",
      onPress: handleNewsPress,
      hasNotification: hasUnreadNews,
    },
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
      // Clear the search field after navigating
      setSearchQuery("");
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Status Bar */}
      <StatusBar style="dark" />

      {/* App Name */}
      <Text
        style={[
          styles.appName,
          typography.robotoBold,
          { color: colors.tertiary, marginTop: 16 },
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
          {newsHeadlines[headlineIndex] ||
            newsHeadlines[0] ||
            "Welcome to ESNYCA"}
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
            onPress={item.onPress || (() => router.push(item.route))}
          >
            <View style={[styles.menuItem, { borderColor: colors.error }]}>
              <MaterialIcons
                name={item.icon}
                size={40}
                color={colors.primary}
              />
              {item.hasNotification && (
                <View
                  style={[
                    styles.notificationDot,
                    { backgroundColor: colors.error },
                  ]}
                >
                  <MaterialIcons name="notifications" size={16} color="white" />
                </View>
              )}
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
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: 150,
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
    marginTop: 14,
    marginBottom: 14,
    borderWidth: 1,
    height: 52,
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  flatListContainer: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  menuItemContainer: {
    flex: 1,
    alignItems: "center",
    marginVertical: 8,
    marginHorizontal: 6,
  },
  menuItem: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  menuText: {
    marginTop: 5,
    textAlign: "center",
  },
  notificationDot: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
