import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useTheme } from "react-native-paper";
import { typography } from "../../constants";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const newsHeadlines = [
  "Innovation is key in every aspect of technology",
  "Breaking: New advancements in AI and automation",
  "Tech industry sees major growth this year",
];

const Home = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prevIndex) => (prevIndex + 1) % newsHeadlines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: "Services", icon: "shopping-cart", route: "/services" },
    { name: "About us", icon: "groups", route: "/about" },
    { name: "Registration", icon: "assignment", route: "/register" },
    { name: "Cooperatives", icon: "business", route: "/cooperatives" },
    { name: "News", icon: "newspaper", route: "/news" },
    { name: "Partnerships", icon: "handshake", route: "/partnerships" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.appName,
          typography.robotoBold,
          typography.body,
          { color: colors.tertiary },
        ]}
      >
        esnyca
      </Text>

      <View style={styles.bannerContainer}>
        <Image
          source={{
            uri: "https://img.freepik.com/free-vector/gradient-breaking-news-background_23-2151151622.jpg?t=st=1740037443~exp=1740041043~hmac=ce634f9b92abeb9fa1f849ea35cce14dafc7d7a152f1b5d4648b59603affdfa2&w=1060",
          }}
          style={styles.bannerImage}
        />
        <Text style={styles.bannerText}>{newsHeadlines[headlineIndex]}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput placeholder="Search" style={styles.searchInput} />
        <Ionicons name="search" size={24} color={colors.secondary} />
      </View>

      <FlatList
        data={menuItems}
        numColumns={3}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: colors.tertiary }]}
            onPress={() => router.push(item.route)}
          >
            <MaterialIcons name={item.icon} size={40} color={colors.primary} />
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
    fontSize: 20,
  },
  bannerContainer: {
    marginTop: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: 200,
  },
  bannerText: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -75 }],
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
    borderColor: "#ccc",
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  flatListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  menuItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  menuText: {
    marginTop: 5,
    textAlign: "center",
  },
});
