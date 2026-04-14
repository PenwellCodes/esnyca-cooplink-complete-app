import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import Toast from "react-native-toast-message";
import { apiRequest } from "../../utils/api";

const CHAT_SYNC_TIMEOUT_MS = 450000;

function openChatFromKey(chatKey, currentUserUid, userMap) {
  try {
    const parts = String(chatKey).split("_");
    const otherUid = parts.find((id) => id !== currentUserUid);
    if (!otherUid) {
      router.push("/(tabs)/chat");
      return;
    }
    const user = userMap?.[otherUid];
    if (!user) {
      router.push("/(tabs)/chat");
      return;
    }
    router.push({
      pathname: `/(screens)/chatConversations/${otherUid}`,
      params: {
        user: JSON.stringify(user),
        predefinedMessage: " ",
      },
    });
  } catch (e) {
    router.push("/(tabs)/chat");
  }
}

function pickNewIncomingToast(prev, next, userUid, activeChatId) {
  if (!userUid || !next) return null;
  if (!prev || Object.keys(prev).length === 0) return null;

  const candidates = [];
  for (const chatKey of Object.keys(next)) {
    const msgs = next[chatKey];
    if (!msgs?.length) continue;
    const latest = msgs[msgs.length - 1];
    const prevMsgs = prev[chatKey];
    const prevLatest = prevMsgs?.length ? prevMsgs[prevMsgs.length - 1] : null;

    if (prevLatest && latest.id === prevLatest.id) continue;
    if (latest.sender === userUid) continue;
    if (latest.read) continue;
    if (activeChatId === chatKey) continue;

    const t = latest.timestamp?.toDate?.()?.getTime?.() ?? Date.now();
    candidates.push({ chatKey, latest, t });
  }

  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a.t >= b.t ? a : b));
}

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [chatList, setChatList] = useState([]);
  const [conversations, setConversations] = useState({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [userMap, setUserMap] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [chatIdMap, setChatIdMap] = useState({});
  const activeChatIdRef = useRef(null);
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const buildDirectKey = (a, b) => {
    if (!a || !b) return null;
    return String(a) > String(b) ? `${a}_${b}` : `${b}_${a}`;
  };

  const toTimestamp = (value) => ({
    toDate: () => new Date(value),
  });

  const refreshChatState = async () => {
    if (!currentUser?.uid) return;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      const userUid = currentUser.uid;
      try {
        const allUsers = await apiRequest("/users", {
          timeoutMs: CHAT_SYNC_TIMEOUT_MS,
        });
        const normalizedUsers = (allUsers || []).map((item) => ({
          id: item.Id || item.id,
          uid: item.Id || item.id,
          email: item.Email || "",
          displayName: item.DisplayName || "",
          role: item.Role || "",
          profilePic: item.ProfilePicUrl || null,
        }));

        const visibleUsers =
          currentUser.role === "cooperative"
            ? normalizedUsers.filter((u) => u.uid !== userUid)
            : normalizedUsers.filter(
                (u) => u.uid !== userUid && u.role === "cooperative"
              );
        setChatList(visibleUsers);

        const nextUserMap = {};
        normalizedUsers.forEach((u) => {
          nextUserMap[u.uid] = u;
        });
        setUserMap(nextUserMap);

        const chats = await apiRequest(
          `/chats?userId=${encodeURIComponent(userUid)}`,
          { timeoutMs: CHAT_SYNC_TIMEOUT_MS }
        );

        const chatPayloads = await Promise.all(
          (chats || []).map(async (chat) => {
            try {
              const [participants, messagesRaw] = await Promise.all([
                apiRequest(`/chats/${chat.Id}/participants`, {
                  timeoutMs: CHAT_SYNC_TIMEOUT_MS,
                }),
                apiRequest(`/chats/${chat.Id}/messages?limit=200`, {
                  timeoutMs: CHAT_SYNC_TIMEOUT_MS,
                }),
              ]);
              return { chat, participants, messagesRaw };
            } catch {
              return null;
            }
          })
        );

        const nextConversations = {};
        const nextLastMessages = {};
        const nextUnread = {};
        const nextChatIdMap = {};

        for (const payload of chatPayloads) {
          if (!payload) continue;
          const { chat, participants, messagesRaw } = payload;
          const participantIds = (participants || []).map((p) => p.UserId);
          if (chat.IsGroup || participantIds.length !== 2) continue;

          const chatKey = buildDirectKey(participantIds[0], participantIds[1]);
          nextChatIdMap[chatKey] = chat.Id;

          const messages = (messagesRaw || [])
            .map((m) => ({
              id: m.Id,
              sender: m.SenderUserId,
              receiver: m.ReceiverUserId,
              text: m.Text,
              fileUrl: m.FileUrl,
              fileName: m.FileName,
              type: m.Type || "text",
              timestamp: toTimestamp(m.CreatedAt),
              read: !!m.ReadAt,
              _chatId: chat.Id,
            }))
            .reverse();

          nextConversations[chatKey] = messages;
          if (messages.length > 0) {
            nextLastMessages[chatKey] = messages[messages.length - 1].timestamp;
          }
          nextUnread[chatKey] = messages.filter(
            (msg) => !msg.read && msg.sender !== userUid
          ).length;
        }

        const noChatsResolved =
          (chats || []).length > 0 && Object.keys(nextConversations).length === 0;
        if (noChatsResolved) {
          setLoadingChats(false);
          return;
        }

        setConversations((prev) => {
          const picked = pickNewIncomingToast(
            prev,
            nextConversations,
            userUid,
            activeChatIdRef.current
          );
          if (picked && AppState.currentState === "active") {
            const { latest, chatKey } = picked;
            const sender = nextUserMap[latest.sender];
            const title = sender?.displayName || "New message";
            let preview = (latest.text || "").trim();
            if (!preview && latest.fileUrl) preview = "📎 Attachment";
            if (latest.type === "story_reply") preview = preview || "Story reply";

            Toast.show({
              type: "info",
              text1: title,
              text2: preview.slice(0, 140),
              position: "top",
              visibilityTime: 5500,
              topOffset: 52,
              onPress: () => {
                Toast.hide();
                openChatFromKey(chatKey, userUid, nextUserMap);
              },
            });
          }
          return nextConversations;
        });

        setLastMessages(nextLastMessages);
        setUnreadCounts(nextUnread);
        setChatIdMap(nextChatIdMap);
        setLoadingChats(false);
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      setChatList([]);
      setConversations({});
      setLastMessages({});
      setUnreadCounts({});
      setChatIdMap({});
      setLoadingChats(false);
      return;
    }

    refreshChatState().catch((error) => {
      console.error("Error refreshing chat state:", error);
      setLoadingChats(false);
    });

    const interval = setInterval(() => {
      refreshChatState().catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [currentUser?.uid, currentUser?.role]);

  const markMessagesAsRead = async (chatId, messages) => {
    try {
      const unreadMessages = messages.filter(
        (msg) => !msg.read && msg.sender !== currentUser.uid
      );
      if (!unreadMessages.length) return;

      const actualChatId = chatIdMap[chatId] || chatId;
      for (const message of unreadMessages) {
        await apiRequest(`/chats/${actualChatId}/messages/${message.id}/read`, {
          method: "POST",
          timeoutMs: CHAT_SYNC_TIMEOUT_MS,
        });
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: Math.max((prev[chatId] || 0) - unreadMessages.length, 0),
      }));
      Toast.hide();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const ensureDirectChat = async (otherUserId) => {
    const chatKey = buildDirectKey(currentUser?.uid, otherUserId);
    if (chatIdMap[chatKey]) return { chatKey, chatId: chatIdMap[chatKey] };

    const created = await apiRequest("/chats", {
      method: "POST",
      timeoutMs: CHAT_SYNC_TIMEOUT_MS,
      body: {
        isGroup: false,
        participantUserIds: [currentUser?.uid, otherUserId],
      },
    });

    const actualChatId = created?.Id || created?.id;
    if (!actualChatId) throw new Error("Failed to create direct chat.");
    setChatIdMap((prev) => ({ ...prev, [chatKey]: actualChatId }));
    return { chatKey, chatId: actualChatId };
  };

  const sendMessage = async ({
    chatKey,
    receiverUserId,
    type = "text",
    text = null,
    fileUrl = null,
    fileName = null,
  }) => {
    let resolved = chatIdMap[chatKey];
    if (!resolved) {
      resolved = (await ensureDirectChat(receiverUserId)).chatId;
    }

    const created = await apiRequest(`/chats/${resolved}/messages`, {
      method: "POST",
      timeoutMs: CHAT_SYNC_TIMEOUT_MS,
      body: {
        senderUserId: currentUser?.uid,
        receiverUserId: receiverUserId || null,
        type,
        text,
        fileUrl,
        fileName,
      },
    });

    refreshChatState().catch((error) => {
      console.error("Background chat refresh failed:", error);
    });
    return created;
  };

  return (
    <ChatContext.Provider
      value={{
        chatList,
        conversations,
        loadingChats,
        markMessagesAsRead,
        activeChatId,
        setActiveChatId,
        userMap,
        lastMessages,
        unreadCounts,
        ensureDirectChat,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
