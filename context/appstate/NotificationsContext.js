import React, { createContext, useContext, useEffect } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../../utils/api";

const NotificationsContext = createContext({});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  // Expo Go (SDK 53+) does not support remote push notifications.
  if (Constants.appOwnership === "expo") {
    return null;
  }

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

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData?.data || null;
}

export const NotificationsProvider = ({ children }) => {
  const { currentUser } = useAuth();

  useEffect(() => {
    const setup = async () => {
      if (!currentUser?.uid) return;
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;
        await apiRequest("/notifications/register-token", {
          method: "POST",
          body: { token },
        });
      } catch (error) {
        console.log("Push setup failed:", error?.message || error);
      }
    };
    setup();
  }, [currentUser?.uid]);

  return (
    <NotificationsContext.Provider value={{}}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
