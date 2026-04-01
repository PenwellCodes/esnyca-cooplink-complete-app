import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Tabs, usePathname, useRouter } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useTheme } from "react-native-paper";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/appstate/AuthContext"; // Import AuthContext
import { useLanguage } from "../../context/appstate/LanguageContext";

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

const TabLayout = () => {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname(); // Get current active route
  const { currentUser } = useAuth(); // Get user state from AuthContext
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();

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
              <TabIcon
                icon={() => (
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={24}
                    color={color}
                  />
                )}
                color={color}
                label={tabLabels.chat}
                isActive={pathname === "/chat"}
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

export default TabLayout;
