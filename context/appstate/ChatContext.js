import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import Toast from "react-native-toast-message";
import { apiRequest } from "../../utils/api";

const CHAT_SYNC_TIMEOUT_MS = 450000;
const GLOBAL_GROUP_CHAT_KEY = "group_swazi_cooperators";
const STORY_REPLY_META_PREFIX = "story_preview:";

function normalizeId(value) {
  return value == null ? "" : String(value).trim().toLowerCase();
}

function encodeStoryPreview(storyPreview) {
  if (!storyPreview) return null;
  try {
    return `${STORY_REPLY_META_PREFIX}${JSON.stringify(storyPreview)}`;
  } catch {
    return null;
  }
}

function decodeStoryPreview(fileName) {
  if (!fileName || typeof fileName !== "string") return null;
  if (!fileName.startsWith(STORY_REPLY_META_PREFIX)) return null;
  const raw = fileName.slice(STORY_REPLY_META_PREFIX.length);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getMessageTimeMs(message) {
  if (!message) return 0;
  try {
    return message.timestamp?.toDate?.()?.getTime?.() ?? 0;
  } catch {
    return 0;
  }
}

function openChatFromKey(chatKey, currentUserUid, userMap) {
  try {
    if (chatKey === GLOBAL_GROUP_CHAT_KEY) {
      const groupChat = {
        uid: GLOBAL_GROUP_CHAT_KEY,
        displayName: "Group",
        profilePicture:
          "https://thumbs.dreamstime.com/b/d-simple-group-user-icon-isolated-render-profile-photo-symbol-ui-avatar-sign-human-management-hr-business-team-person-people-268135505.jpg",
        memberCount: Object.keys(userMap || {}).length,
        isGroup: true,
      };
      router.push({
        pathname: "/(screens)/group-chat",
        params: { id: groupChat.uid, group: JSON.stringify(groupChat) },
      });
      return;
    }

    const parts = String(chatKey).split("_");
    const me = normalizeId(currentUserUid);
    const otherUid = parts.find((id) => normalizeId(id) !== me);
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
  const currentUserId = currentUser?.id || currentUser?.uid || null;
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
    const aa = normalizeId(a);
    const bb = normalizeId(b);
    return aa > bb ? `${aa}_${bb}` : `${bb}_${aa}`;
  };

  const toTimestamp = (value) => ({
    toDate: () => new Date(value),
  });

  const refreshChatState = async () => {
    if (!currentUserId) return;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      const userUid = normalizeId(currentUserId);
      try {
        const allUsers = await apiRequest("/users", {
          timeoutMs: CHAT_SYNC_TIMEOUT_MS,
        });
        const normalizedUsers = (allUsers || []).map((item) => ({
          id: item.Id || item.id,
          uid: normalizeId(item.Id || item.id),
          email: item.Email || "",
          displayName: item.DisplayName || "",
          role: item.Role || "",
          profilePic:
            item.profilePic ||
            item.profilePicUrl ||
            item.ProfilePicUrl ||
            item.ProfilePic ||
            null,
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
          nextUserMap[normalizeId(u.uid)] = u;
        });
        setUserMap(nextUserMap);

        let chats = [];
        try {
          chats = await apiRequest(
            `/chats?userId=${encodeURIComponent(String(userUid))}`,
            {
              timeoutMs: CHAT_SYNC_TIMEOUT_MS,
            }
          );
        } catch (_errorWithUserId) {
          try {
            chats = await apiRequest(`/chats`, {
              timeoutMs: CHAT_SYNC_TIMEOUT_MS,
            });
          } catch (fallbackError) {
            console.log(
              "Chat refresh warning:",
              fallbackError?.message || fallbackError
            );
            setLoadingChats(false);
            return;
          }
        }

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
          const participantIds = (participants || []).map((p) =>
            normalizeId(p.UserId)
          );
          if (!participantIds.includes(userUid)) continue;
          let chatKey = chat.Id;
          if (chat.IsGroup) {
            chatKey = GLOBAL_GROUP_CHAT_KEY;
          } else if (participantIds.length === 2) {
            chatKey = buildDirectKey(participantIds[0], participantIds[1]);
          } else {
            continue;
          }
          const messages = (messagesRaw || [])
            .map((m) => ({
              id: m.Id,
              sender: m.SenderUserId,
              receiver: m.ReceiverUserId,
              text: m.Text,
              fileUrl: m.FileUrl,
              fileName: m.FileName,
              type: m.Type || "text",
              storyPreview:
                (m.Type || "text") === "story_reply"
                  ? {
                      ...(decodeStoryPreview(m.FileName) || {}),
                      imageURL:
                        m.FileUrl ||
                        decodeStoryPreview(m.FileName)?.imageURL ||
                        null,
                    }
                  : null,
              timestamp: toTimestamp(m.CreatedAt),
              read: !!m.ReadAt,
              _chatId: chat.Id,
            }))
            .reverse();

          const existingMessages = nextConversations[chatKey] || [];
          const existingLatestMs = getMessageTimeMs(
            existingMessages[existingMessages.length - 1]
          );
          const incomingLatestMs = getMessageTimeMs(messages[messages.length - 1]);
          const shouldReplace =
            !existingMessages.length || incomingLatestMs >= existingLatestMs;

          if (shouldReplace) {
            nextConversations[chatKey] = messages;
            nextChatIdMap[chatKey] = chat.Id;
            if (messages.length > 0) {
              nextLastMessages[chatKey] = messages[messages.length - 1].timestamp;
            } else {
              delete nextLastMessages[chatKey];
            }
            nextUnread[chatKey] = messages.filter(
              (msg) => !msg.read && msg.sender !== userUid
            ).length;
          }
        }

        const noChatsResolved =
          (chats || []).length > 0 && Object.keys(nextConversations).length === 0;
        if (noChatsResolved) {
          setLoadingChats(false);
          return;
        }

        setConversations((prev) => {
          const hasIncomingData = Object.keys(nextConversations).length > 0;
          if (!hasIncomingData && Object.keys(prev).length > 0) {
            return prev;
          }
          const picked = pickNewIncomingToast(
            prev,
            nextConversations,
            userUid,
            activeChatIdRef.current
          );
          if (picked && AppState.currentState === "active") {
            const { latest, chatKey } = picked;
            const sender = nextUserMap[normalizeId(latest.sender)];
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

        if (Object.keys(nextConversations).length > 0) {
          setLastMessages(nextLastMessages);
          setUnreadCounts(nextUnread);
          setChatIdMap(nextChatIdMap);
        }
        setLoadingChats(false);
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  useEffect(() => {
    if (!currentUserId) {
      setChatList([]);
      setConversations({});
      setLastMessages({});
      setUnreadCounts({});
      setChatIdMap({});
      setLoadingChats(false);
      return;
    }

    refreshChatState().catch((error) => {
      console.log("Chat refresh warning:", error?.message || error);
      setLoadingChats(false);
    });

    const interval = setInterval(() => {
      refreshChatState().catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [currentUserId, currentUser?.role]);

  // FIXED: Mark messages as read and refresh unread counts
  const markMessagesAsRead = async (chatId, messages) => {
    try {
      const unreadMessages = messages.filter(
        (msg) => !msg.read && normalizeId(msg.sender) !== normalizeId(currentUserId)
      );
      if (!unreadMessages.length) return;

      const actualChatId = chatIdMap[chatId] || chatId;
      for (const message of unreadMessages) {
        await apiRequest(`/chats/${actualChatId}/messages/${message.id}/read`, {
          method: "POST",
          timeoutMs: CHAT_SYNC_TIMEOUT_MS,
        });
      }

      // Update local unread count
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: Math.max((prev[chatId] || 0) - unreadMessages.length, 0),
      }));
      
      // Refresh the entire chat state to ensure consistency
      await refreshChatState();
      
      Toast.hide();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // NEW: Function to manually refresh chats
  const refreshChats = useCallback(async () => {
    if (!currentUserId) return false;
    try {
      await refreshChatState();
      return true;
    } catch (error) {
      console.error("Error refreshing chats:", error);
      return false;
    }
  }, [currentUserId, refreshChatState]);

  // NEW: Function to get total unread count
  const getTotalUnreadCount = useCallback(() => {
    let total = 0;
    Object.values(unreadCounts).forEach(count => {
      total += (Number(count) || 0);
    });
    return total;
  }, [unreadCounts]);

  // NEW: Force refresh unread counts directly from conversations
  const forceRefreshUnreadCounts = useCallback(async () => {
    if (!currentUserId) return {};
    
    try {
      // Force refresh the entire chat state first
      await refreshChatState();
      
      // Calculate unread counts directly from conversations
      const userUid = normalizeId(currentUserId);
      const newUnreadCounts = {};
      
      Object.keys(conversations).forEach(chatKey => {
        const chatMessages = conversations[chatKey] || [];
        const unread = chatMessages.filter(msg => {
          const isReceiver = normalizeId(msg.receiver) === userUid;
          const isNotRead = !msg.read && msg.status !== 'read';
          const isNotFromCurrentUser = normalizeId(msg.sender) !== userUid;
          return isReceiver && isNotRead && isNotFromCurrentUser;
        }).length;
        
        if (unread > 0) {
          newUnreadCounts[chatKey] = unread;
        }
      });
      
      setUnreadCounts(newUnreadCounts);
      return newUnreadCounts;
    } catch (error) {
      console.error("Error forcing refresh unread counts:", error);
      return {};
    }
  }, [currentUserId, conversations, refreshChatState]);

  const ensureDirectChat = async (otherUserId) => {
    const chatKey = buildDirectKey(currentUserId, otherUserId);
    if (chatIdMap[chatKey]) return { chatKey, chatId: chatIdMap[chatKey] };

    try {
      const created = await apiRequest("/chats", {
        method: "POST",
        timeoutMs: CHAT_SYNC_TIMEOUT_MS,
        body: {
          isGroup: false,
          participantUserIds: [currentUserId, otherUserId],
        },
      });

      const actualChatId = created?.Id || created?.id;
      if (!actualChatId) throw new Error("Failed to create direct chat.");
      setChatIdMap((prev) => ({ ...prev, [chatKey]: actualChatId }));
      return { chatKey, chatId: actualChatId };
    } catch (createError) {
      try {
        let chats = [];
        try {
          chats = await apiRequest(
            `/chats?userId=${encodeURIComponent(String(currentUserId))}`,
            { timeoutMs: CHAT_SYNC_TIMEOUT_MS }
          );
        } catch {
          chats = await apiRequest(`/chats`, { timeoutMs: CHAT_SYNC_TIMEOUT_MS });
        }

        for (const chat of chats || []) {
          if (chat?.IsGroup) continue;
          const participants = await apiRequest(`/chats/${chat.Id}/participants`, {
            timeoutMs: CHAT_SYNC_TIMEOUT_MS,
          });
          const ids = (participants || []).map((p) => String(p.UserId));
          if (
            ids.length === 2 &&
            ids.map(normalizeId).includes(normalizeId(currentUserId)) &&
            ids.map(normalizeId).includes(normalizeId(otherUserId))
          ) {
            setChatIdMap((prev) => ({ ...prev, [chatKey]: chat.Id }));
            return { chatKey, chatId: chat.Id };
          }
        }
      } catch {
        // Ignore fallback sync lookup errors
      }

      throw createError;
    }
  };

  const ensureGlobalGroupChat = async () => {
    if (chatIdMap[GLOBAL_GROUP_CHAT_KEY]) {
      return { chatKey: GLOBAL_GROUP_CHAT_KEY, chatId: chatIdMap[GLOBAL_GROUP_CHAT_KEY] };
    }

    const usersRaw = await apiRequest("/users", { timeoutMs: CHAT_SYNC_TIMEOUT_MS });
    const participantUserIds = (usersRaw || []).map((u) => u.Id || u.id).filter(Boolean);
    const created = await apiRequest("/chats", {
      method: "POST",
      timeoutMs: CHAT_SYNC_TIMEOUT_MS,
      body: { isGroup: true, participantUserIds },
    });
    const actualChatId = created?.Id || created?.id;
    if (!actualChatId) throw new Error("Failed to create group chat.");
    setChatIdMap((prev) => ({ ...prev, [GLOBAL_GROUP_CHAT_KEY]: actualChatId }));
    return { chatKey: GLOBAL_GROUP_CHAT_KEY, chatId: actualChatId };
  };

  const sendMessage = async ({
    chatKey,
    receiverUserId,
    type = "text",
    text = null,
    fileUrl = null,
    fileName = null,
    storyPreview = null,
  }) => {
    let resolved = chatIdMap[chatKey];
    if (!resolved) {
      const existingMessages = conversations[chatKey] || [];
      const fallbackFromMessages =
        existingMessages[existingMessages.length - 1]?._chatId ||
        existingMessages[0]?._chatId;
      if (fallbackFromMessages) {
        resolved = fallbackFromMessages;
      }
    }
    if (!resolved) {
      if (chatKey === GLOBAL_GROUP_CHAT_KEY) {
        resolved = (await ensureGlobalGroupChat()).chatId;
      } else {
        resolved = (await ensureDirectChat(receiverUserId)).chatId;
      }
    }

    const created = await apiRequest(`/chats/${resolved}/messages`, {
      method: "POST",
      timeoutMs: CHAT_SYNC_TIMEOUT_MS,
      body: {
        senderUserId: currentUserId,
        receiverUserId: receiverUserId || null,
        type,
        text,
        fileUrl:
          type === "story_reply"
            ? storyPreview?.imageURL || fileUrl || null
            : fileUrl,
        fileName:
          type === "story_reply"
            ? encodeStoryPreview(storyPreview) || fileName
            : fileName,
      },
    });

    const createdMessage = {
      id: created?.Id || created?.id || `${Date.now()}`,
      sender: created?.SenderUserId || currentUserId,
      receiver:
        created?.ReceiverUserId === undefined
          ? receiverUserId || null
          : created?.ReceiverUserId,
      text: created?.Text ?? text ?? null,
      fileUrl: created?.FileUrl ?? fileUrl ?? null,
      fileName: created?.FileName ?? fileName ?? null,
      type: created?.Type || type || "text",
      storyPreview:
        (created?.Type || type || "text") === "story_reply"
          ? {
              ...(storyPreview ||
                decodeStoryPreview(created?.FileName || fileName) ||
                {}),
              imageURL:
                created?.FileUrl ||
                storyPreview?.imageURL ||
                fileUrl ||
                null,
            }
          : null,
      timestamp: toTimestamp(created?.CreatedAt || new Date().toISOString()),
      read: !!created?.ReadAt,
      _chatId: created?.ChatId || resolved,
    };

    setChatIdMap((prev) => ({ ...prev, [chatKey]: resolved }));
    setConversations((prev) => {
      const existing = prev[chatKey] || [];
      const alreadyExists = existing.some(
        (m) => String(m.id) === String(createdMessage.id)
      );
      if (alreadyExists) return prev;
      return {
        ...prev,
        [chatKey]: [...existing, createdMessage],
      };
    });
    setLastMessages((prev) => ({
      ...prev,
      [chatKey]: createdMessage.timestamp,
    }));

    refreshChatState().catch((error) => {
      console.log("Background chat refresh warning:", error?.message || error);
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
        refreshChats,
        getTotalUnreadCount,
        forceRefreshUnreadCounts, // NEW: Added
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;