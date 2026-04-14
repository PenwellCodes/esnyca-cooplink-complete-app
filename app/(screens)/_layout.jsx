import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/appstate/LanguageContext";

const Layout = () => {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const { currentLanguage, t } = useLanguage();

  const barStyle = dark ? "light" : "dark";
  const headerTint = dark ? "#fff" : colors.tertiary;

  const screenDefs = [
    { name: "about-us", title: "About Us" },
    { name: "add-story", title: "Add Story" },
    { name: "view-story", title: "View Story" },
    { name: "news", title: "News" },
    { name: "cooperatives", title: "Cooperatives" },
    { name: "support", title: "Support" },
    { name: "partnerships", title: "Partnerships" },
    { name: "profile", title: "Profile" },
    { name: "ourstory", title: "Our Story" },
    { name: "product-services-result", title: "Product Services" },
  ];

  const [translatedTitles, setTranslatedTitles] = useState({});

  useEffect(() => {
    const loadTitles = async () => {
      const next = {};
      for (const def of screenDefs) {
        next[def.name] = await t(def.title);
      }
      setTranslatedTitles(next);
    };
    loadTitles();
  }, [currentLanguage, t]);

  return (
    <>
      <Stack>
        {screenDefs.map(({ name, title }) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              title: translatedTitles[name] || title,
              headerStyle: { backgroundColor: colors.background },
              // Use dark text/icons on light backgrounds, light on dark
              headerTintColor: headerTint,
              headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color={headerTint} />
                </TouchableOpacity>
              ),
            }}
          />
        ))}
      </Stack>
      <StatusBar style={barStyle} backgroundColor={colors.background} />
    </>
  );
};

export default Layout;
