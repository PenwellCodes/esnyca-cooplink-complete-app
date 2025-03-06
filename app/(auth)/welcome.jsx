import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useRef, useState, useEffect } from "react";
import Swiper from "react-native-swiper";
import { CustomButton } from "../../components";
import { onboardingText, typography } from "../../constants";
import { useTheme } from "react-native-paper";
import { useOnboarding } from "../../hooks/useOnboarding";

import React from "react";

const Onboarding = () => {
  const { colors } = useTheme();
  const { isFirstLaunch, completeOnboarding } = useOnboarding();
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === onboardingText.length - 1;

  useEffect(() => {
    if (isFirstLaunch === false) {
      router.replace("/(tabs)/home");
    }
  }, [isFirstLaunch]);

  if (isFirstLaunch === null || isFirstLaunch === false) {
    return null;
  }

  const handleComplete = async () => {
    await completeOnboarding();
    router.replace("/(tabs)/home");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableOpacity
        onPress={handleComplete}
        style={styles.skipButton}
      >
        <Text
          style={[
            typography.robotoBold,
            typography.small,
            { color: colors.tertiary },
          ]}
        >
          Skip
        </Text>
      </TouchableOpacity>
      <Swiper
        ref={swiperRef}
        loop={false}
        dot={
          <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
        }
        activeDot={
          <View
            style={[styles.activeDot, { backgroundColor: colors.primary }]}
          />
        }
        onIndexChanged={(index) => setActiveIndex(index)}
      >
        {onboardingText.map((item) => (
          <View key={item.id} style={styles.slide}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
            <View style={styles.titleContainer}>
              <Text
                style={[
                  typography.robotoBold,
                  typography.title,
                  { color: colors.tertiary },
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  typography.robotoRegular,
                  typography.body,
                  { color: colors.tertiary },
                ]}
              >
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </Swiper>
      <CustomButton
        title={isLastSlide ? "Get Started" : "Next"}
        onPress={() =>
          isLastSlide
            ? handleComplete()
            : swiperRef.current?.scrollBy(1)
        }
        style={styles.customButton}
      />
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 20,
  },
  dot: {
    width: 32,
    height: 4,
    borderRadius: 9999,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 32,
    height: 4,
    borderRadius: 9999,
    marginHorizontal: 4,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 6
  },
  titleContainer: {
    width: "100%",
    marginTop: 40,
  },
  customButton: {
    width: "90%",
    marginTop: 40,
    marginBottom: 20,
  },
});
