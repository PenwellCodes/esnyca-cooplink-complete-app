import React from "react";
import { StatusBar } from "expo-status-bar";
import { Tabs, usePathname, useRouter } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useTheme } from "react-native-paper";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "../../context/appstate/AuthContext"; // Import AuthContext

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
  const pathname = usePathname(); // Get current active route
  const { currentUser } = useAuth(); // Get user state from AuthContext
  const router = useRouter();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tertiary,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 60,
            borderTopWidth: 0,
            backgroundColor: colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => <AntDesign name="home" size={24} color={color} />}
                color={color}
                label="Home"
                isActive={pathname === "/home"}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
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
                label="Chat"
                isActive={pathname === "/chat"}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!currentUser) {
                e.preventDefault(); // Prevent navigation to Chat
                router.replace("/sign-in"); // Redirect to sign-in
              }
            },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => (
                  <Ionicons name="settings-outline" size={24} color={color} />
                )}
                color={color}
                label="Settings"
                isActive={pathname === "/settings"}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="location"
          options={{
            title: "Location",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={() => <Feather name="map-pin" size={24} color={color} />}
                color={color}
                label="Locations"
                isActive={pathname === "/location"}
              />
            ),
          }}
        />
      </Tabs>
      <StatusBar backgroundColor={colors.background} style="standard" />
    </>
  );
};

export default TabLayout;
