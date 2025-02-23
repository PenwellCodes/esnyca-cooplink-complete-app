import { StatusBar } from "expo-status-bar";
import React from "react";
import { Stack } from "expo-router";

const Layout = () => {
  return (
    <>
      <Stack>
        <Stack.Screen
          name="about-us"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="account-settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-story"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="view-story"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="news"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="cooperatives"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="financial-services"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="marketing-and-promotion"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="research-and-insights"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="missions-and-vision"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="news-listing"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="partnerships"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="training-and-development"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="our-story"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="meet-the-team"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="cooperative-listing"
          options={{
            headerShown: false,
          }}
        />
        
      </Stack>
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default Layout;
