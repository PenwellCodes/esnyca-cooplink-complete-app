import React, { useEffect, useMemo, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { Tabs, usePathname, useRouter, useFocusEffect } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/appstate/AuthContext";
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
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { 
    conversations, 
    refreshChats, 
    forceRefreshUnreadCounts,
    unreadCounts,
    loadingChats,
    isChatReady,
    getTotalUnreadCount,
  } = useChat();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();
  const [totalUnreadChats, setTotalUnreadChats] = useState(null);

  const calculateTotalUnread = useCallback(() => {
    return getTotalUnreadCount();
  }, [getTotalUnreadCount]);

  useEffect(() => {
    if (!currentUser) {
      setTotalUnreadChats(0);
      return;
    }

    if (loadingChats || !isChatReady) {
      setTotalUnreadChats(null);
      return;
    }

    const total = calculateTotalUnread();
    setTotalUnreadChats(total);
  }, [currentUser, loadingChats, isChatReady, calculateTotalUnread]);

  useEffect(() => {
    const total = calculateTotalUnread();
    if (!loadingChats && isChatReady) {
      setTotalUnreadChats(total);
    }
  }, [unreadCounts, conversations, loadingChats, isChatReady, calculateTotalUnread]);

  // Background unread refresh for the nav badge
  useEffect(() => {
    if (!currentUser) return undefined;

    const intervalId = setInterval(() => {
      if (forceRefreshUnreadCounts) {
        forceRefreshUnreadCounts().catch((error) => {
          console.log("Chat badge refresh failed:", error?.message || error);
        });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [currentUser, forceRefreshUnreadCounts]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        if (refreshChats) {
          await refreshChats();
          if (forceRefreshUnreadCounts) {
            await forceRefreshUnreadCounts();
          }
          const total = calculateTotalUnread();
          setTotalUnreadChats(total);
        }
      };
      refresh();
    }, [refreshChats, forceRefreshUnreadCounts, calculateTotalUnread])
  );

  // Refresh on mount
  useEffect(() => {
    const refresh = async () => {
      if (refreshChats) {
        await refreshChats();
        if (forceRefreshUnreadCounts) {
          await forceRefreshUnreadCounts();
        }
        const total = calculateTotalUnread();
        setTotalUnreadChats(total);
      }
    };
    refresh();
  }, []); // Empty dependency array for mount only

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
                e.preventDefault();
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
          listeners={{
            tabPress: (e) => {
              if (!currentUser) {
                e.preventDefault();
                const returnTo = encodeURIComponent("/(tabs)/settings");
                router.push(`/(auth)/sign-in?returnTo=${returnTo}`);
              }
            },
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