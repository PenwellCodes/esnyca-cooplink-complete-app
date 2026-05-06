import React, { createContext, useContext, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform, LogBox } from "react-native";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../../utils/api";
import { router } from "expo-router";

// Ignore Expo Go warning
LogBox.ignoreLogs(['expo-notifications:']);

const NotificationsContext = createContext({});

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// Only configure if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData?.data || null;
  } catch (error) {
    console.log("Error getting push token:", error);
    return null;
  }
}

export const NotificationsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const setup = async () => {
      if (!currentUser?.uid || isExpoGo) return;
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;
        await apiRequest("/notifications/register-token", {
          method: "POST",
          body: { token, userId: currentUser.uid, platform: Platform.OS },
        });
        console.log("Push token registered");
      } catch (error) {
        console.log("Push setup failed:", error?.message || error);
      }
    };
    setup();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (isExpoGo) return;

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification tapped:", response);
        const { data } = response.notification.request.content;
        if (data?.chatId && data?.senderUserId) {
          router.push({
            pathname: `/(screens)/chatConversations/${data.senderUserId}`,
            params: {
              user: JSON.stringify({
                uid: data.senderUserId,
                displayName: data.userName || 'User',
              }),
            },
          });
        }
      }
    );

    // FIXED: Correct cleanup for expo-notifications
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <NotificationsContext.Provider value={{ isExpoGo }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);