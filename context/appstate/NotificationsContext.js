import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform, LogBox, AppState, Vibration, Alert } from "react-native";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../../utils/api";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

// Ignore Expo Go warning
LogBox.ignoreLogs(['expo-notifications:']);

/** Synced from NotificationsProvider — used by module-level notification handler */
const foregroundNotificationUserRef = { uid: null };

const NotificationsContext = createContext({});

function normalizeUid(value) {
  return value == null ? "" : String(value).trim().toLowerCase();
}

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// Configure notification handler — suppress system banner/sound for own-message echoes
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data || {};
      const senderId = normalizeUid(data.senderUserId ?? data.senderId);
      const me = foregroundNotificationUserRef.uid;
      if (me && senderId && senderId === me) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        };
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.log("⚠️ Expo Go doesn't support push notifications");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      showBadge: true,
    });
    
    // Create a high priority channel for messages (WhatsApp style)
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#25D366", // WhatsApp green color
      sound: "default",
      showBadge: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("❌ Notification permissions not granted");
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
  if (!projectId) {
    console.log("❌ No project ID found");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("✅ Expo push token:", tokenData?.data);
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
  const [lastNotification, setLastNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInChat, setIsInChat] = useState(false);

  useEffect(() => {
    foregroundNotificationUserRef.uid = currentUser?.uid
      ? normalizeUid(currentUser.uid)
      : null;
  }, [currentUser?.uid]);

  // Register for push notifications
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
        console.log("✅ Push token registered successfully");
      } catch (error) {
        console.log("Push setup failed:", error?.message || error);
      }
    };
    setup();
  }, [currentUser?.uid]);

  // Show WhatsApp-style toast notification (banner at top)
  const showWhatsAppToast = (title, message, data) => {
    const senderId = normalizeUid(data?.senderUserId ?? data?.senderId);
    const me = currentUser?.uid ? normalizeUid(currentUser.uid) : "";
    if (senderId && me && senderId === me) {
      return;
    }

    console.log(`📱 [WhatsApp Style Toast] ${title}: ${message}`);

    // Don't show toast if user is currently in the chat
    if (isInChat && data?.senderUserId === data?.currentChatUserId) {
      console.log("User is currently in this chat, skipping toast");
      return;
    }

    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    setUnreadCount((prev) => prev + 1);
    
    // Show WhatsApp-style toast banner
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
      onPress: () => {
        console.log("Toast pressed, navigating to chat");
        if (data?.chatId && data?.senderUserId) {
          router.push({
            pathname: `/(screens)/chatConversations/${data.senderUserId}`,
            params: {
              user: JSON.stringify({
                uid: data.senderUserId,
                displayName: data.userName || title,
                profilePic: data.userAvatar || '',
              }),
            },
          });
        }
      },
    });
  };

  // Show WhatsApp-style alert (popup modal) - fallback for important notifications
  const showWhatsAppAlert = (title, message, data) => {
    const senderId = normalizeUid(data?.senderUserId ?? data?.senderId);
    const me = currentUser?.uid ? normalizeUid(currentUser.uid) : "";
    if (senderId && me && senderId === me) {
      return;
    }

    console.log(`📱 [WhatsApp Style Alert] ${title}: ${message}`);

    if (isInChat && data?.senderUserId === data?.currentChatUserId) {
      console.log("User is currently in this chat, skipping alert");
      return;
    }

    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    setUnreadCount((prev) => prev + 1);
    
    // Show WhatsApp-style alert with Reply option
    Alert.alert(
      title,
      message,
      [
        {
          text: "Close",
          style: "cancel",
          onPress: () => console.log("Alert closed"),
        },
        {
          text: "Reply",
          onPress: () => {
            console.log("Reply pressed, navigating to chat");
            if (data?.chatId && data?.senderUserId) {
              router.push({
                pathname: `/(screens)/chatConversations/${data.senderUserId}`,
                params: {
                  user: JSON.stringify({
                    uid: data.senderUserId,
                    displayName: data.userName || title,
                    profilePic: data.userAvatar || '',
                  }),
                },
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Listen for notifications when app is in foreground
  useEffect(() => {
    if (isExpoGo) {
      console.log("⚠️ Push notifications not available in Expo Go");
      return;
    }

    // When notification is received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📱 Foreground notification received:", notification);

        const { title, body, data } = notification.request.content;
        const senderId = normalizeUid(data?.senderUserId ?? data?.senderId);
        const me = currentUser?.uid ? normalizeUid(currentUser.uid) : "";
        if (senderId && me && senderId === me) {
          return;
        }

        const senderName = title || data?.userName || "New message";
        const messageBody = body || "Sent you a message";

        showWhatsAppToast(senderName, messageBody, {
          ...data,
          currentChatUserId: data?.currentChatUserId,
        });
      }
    );

    // When user taps on notification (app in background or closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("👆 Notification tapped:", response);
        
        const { data } = response.notification.request.content;
        
        if (data?.chatId && data?.senderUserId) {
          // Navigate to the chat screen like WhatsApp
          router.push({
            pathname: `/(screens)/chatConversations/${data.senderUserId}`,
            params: {
              user: JSON.stringify({
                uid: data.senderUserId,
                displayName: data.userName || 'User',
                profilePic: data.userAvatar || '',
              }),
            },
          });
        }
      }
    );

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('App state changed to:', nextAppState);
    });

    // Cleanup — use subscription.remove() (removeNotificationSubscription was removed in expo-notifications)
    return () => {
      notificationListener.current?.remove?.();
      responseListener.current?.remove?.();
      subscription?.remove?.();
      notificationListener.current = undefined;
      responseListener.current = undefined;
    };
  }, [isInChat, currentUser?.uid]);

  // Function to set whether user is currently in a chat
  const setUserInChat = (inChat, chatUserId = null) => {
    setIsInChat(inChat);
    if (inChat && chatUserId) {
      console.log(`User entered chat with ${chatUserId}`);
    }
  };

  // Function to get unread count
  const getUnreadCount = () => unreadCount;
  
  // Function to reset unread count
  const resetUnreadCount = () => setUnreadCount(0);
  
  // Function to schedule a local notification (for testing)
  const scheduleLocalNotification = async (title, body, data = {}) => {
    if (isExpoGo) {
      console.log("Local notifications not fully supported in Expo Go");
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
      console.log("✅ Local notification scheduled");
    } catch (error) {
      console.error("Error scheduling local notification:", error);
    }
  };

  // Function to test notification (for debugging)
  const testNotification = () => {
    showWhatsAppToast(
      "Test Notification",
      "This is a test message from your app",
      { test: true }
    );
  };

  return (
    <NotificationsContext.Provider value={{ 
      isExpoGo,
      lastNotification,
      unreadCount,
      getUnreadCount,
      resetUnreadCount,
      scheduleLocalNotification,
      showWhatsAppAlert,
      showWhatsAppToast,
      setUserInChat,
      testNotification,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    console.warn("useNotifications must be used within a NotificationsProvider");
    return {
      isExpoGo: true,
      lastNotification: null,
      unreadCount: 0,
      getUnreadCount: () => 0,
      resetUnreadCount: () => {},
      scheduleLocalNotification: async () => {},
      showWhatsAppAlert: () => {},
      showWhatsAppToast: () => {},
      setUserInChat: () => {},
      testNotification: () => {},
    };
  }
  return context;
};