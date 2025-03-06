import { StatusBar } from "expo-status-bar";
import React from "react";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Layout = () => {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <>
      <Stack>
        {[
          { name: "about-us", title: "About Us" },
          { name: "add-story", title: "Add Story" },
          { name: "group-chat", title: "Group Chat" },
          { name: "view-story", title: "View Story" },
          { name: "news", title: "News" },
          { name: "cooperatives", title: "Cooperatives" },
          { name: "support", title: "Support" },
          { name: "news-listing", title: "News Listing" },
          { name: "partnerships", title: "Partnerships" },
          { name: "profile", title: "Profile" },
          { name: "ourstory", title: "Our Story" },
          { name: "product-services-result"}
       
        ].map(({ name, title }) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              title,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: "#fff", // Ensures text is visible
              headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              ),
            }}
          />
        ))}
      </Stack>
      <StatusBar backgroundColor={colors.background} style="light" />
    </>
  );
};

export default Layout;
