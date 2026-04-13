import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Tabs, usePathname, useRouter } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/appstate/AuthContext"; // Import AuthContext
import { useLanguage } from "../../context/appstate/LanguageContext";
import { useChat } from "../../context/appstate/ChatContext";

const TabIcon = ({ icon, color, label, isActive }) => (
  <View style={{ alignItems: "center", width: 70 }}>
    {icon({ color })}
    {isActive && (
      <Text
        style={{ color, fontSize: 12, textAlign: "center", flexWrap: "wrap" }}
      >
        {label}
      </Text>
    )}
  </View>
);

function ChatTabIcon({ color, label, isActive, unreadTotal }) {
  const display =
    unreadTotal > 99 ? "99+" : unreadTotal > 0 ? String(unreadTotal) : "";
  return (
    <View style={styles.chatTabWrap}>
      <View style={styles.chatIconWrap}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={24}
          color={color}
        />
        {unreadTotal > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{display}</Text>
          </View>
        ) : null}
      </View>
      {isActive ? (
        <Text
          style={{ color, fontSize: 12, textAlign: "center", flexWrap: "wrap" }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const TabLayout = () => {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname(); // Get current active route
  const { currentUser } = useAuth(); // Get user state from AuthContext
  const { unreadCounts } = useChat();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();

  const totalUnreadChats = useMemo(() => {
    if (!currentUser?.uid || !unreadCounts) return 0;
    return Object.values(unreadCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [currentUser?.uid, unreadCounts]);

  const [tabLabels, setTabLabels] = useState({
    home: "Home",
    chat: "Chat",
    settings: "Settings",
    location: "Locations",
  });

  useEffect(() => {
    const loadTabLabels = async () => {
      setTabLabels({
        home: await t("Home"),
        chat: await t("Chat"),
        settings: await t("Settings"),
        location: await t("Locations"),
      });
    };
    loadTabLabels();
  }, [currentLanguage, t]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tertiary,
          tabBarShowLabel: false,
          tabBarStyle: {
            // Keep the tab bar above the phone's bottom nav / gesture bar
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            borderTopWidth: 0,
            backgroundColor: colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: tabLabels.home,
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => <AntDesign name="home" size={24} color={color} />}
                color={color}
                label={tabLabels.home}
                isActive={pathname === "/home"}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: tabLabels.chat,
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <ChatTabIcon
                color={color}
                label={tabLabels.chat}
                isActive={pathname === "/chat"}
                unreadTotal={totalUnreadChats}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!currentUser) {
                e.preventDefault(); // Prevent navigation to Chat
                // Push (not replace) so the sign-in screen can go "back" to the previous tab.
                // Also pass returnTo so after successful login we can route to the tab the user intended.
                const returnTo = encodeURIComponent("/(tabs)/chat");
                router.push(`/(auth)/sign-in?returnTo=${returnTo}`);
              }
            },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: tabLabels.settings,
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => (
                  <Ionicons name="settings-outline" size={24} color={color} />
                )}
                color={color}
                label={tabLabels.settings}
                isActive={pathname === "/settings"}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="location"
          options={{
            title: tabLabels.location,
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => <Feather name="map-pin" size={24} color={color} />}
                color={color}
                label={tabLabels.location}
                isActive={pathname === "/location"}
              />
            ),
          }}
        />
      </Tabs>
      {/* Status bar on tabs: use theme.dark to choose icon color */}
      <StatusBar style={dark ? "light" : "dark"} backgroundColor={colors.background} />
    </>
  );
};

const styles = StyleSheet.create({
  chatTabWrap: {
    alignItems: "center",
    width: 70,
  },
  chatIconWrap: {
    position: "relative",
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default TabLayout;
