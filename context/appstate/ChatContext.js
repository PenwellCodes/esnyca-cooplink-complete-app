import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import Toast from "react-native-toast-message";
import { apiRequest } from "../../utils/api";

const ChatContext = createContext();

export const useChat = () => {
    return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
    const GLOBAL_GROUP_CHAT_KEY = "group_swazi_cooperators";
    const { currentUser } = useAuth();
    const [chatList, setChatList] = useState([]);
    const [conversations, setConversations] = useState({});
    const [loadingChats, setLoadingChats] = useState(true);
    const [activeChatId, setActiveChatId] = useState(null);
    const [lastMessages, setLastMessages] = useState({});
    const [userMap, setUserMap] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const [chatIdMap, setChatIdMap] = useState({});

    // Function to update unread counts
    const updateUnreadCount = (chatId, messages) => {
        const unreadCount = messages.filter(
            msg => !msg.read && msg.sender !== currentUser?.uid
        ).length;
        
        setUnreadCounts(prev => ({
            ...prev,
            [chatId]: unreadCount
        }));
        
        return unreadCount;
    };

    const buildDirectKey = (a, b) => {
        if (!a || !b) return null;
        return String(a) > String(b) ? `${a}_${b}` : `${b}_${a}`;
    };

    const toTimestamp = (value) => ({
        toDate: () => new Date(value),
    });

    const refreshChatState = async () => {
        if (!currentUser?.uid) return;
        const userUid = currentUser.uid;

        const allUsers = await apiRequest("/users");
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
                      (u) => u.uid !== userUid && u.role === "cooperative",
                  );
        setChatList(visibleUsers);

        const nextUserMap = {};
        normalizedUsers.forEach((u) => {
            nextUserMap[u.uid] = u;
        });
        setUserMap(nextUserMap);

        const chats = await apiRequest(`/chats?userId=${encodeURIComponent(userUid)}`);
        const nextConversations = {};
        const nextLastMessages = {};
        const nextUnread = {};
        const nextChatIdMap = {};

        for (const chat of chats || []) {
            const participants = await apiRequest(`/chats/${chat.Id}/participants`);
            const participantIds = (participants || []).map((p) => p.UserId);
            let chatKey = chat.Id;

            if (chat.IsGroup) {
                chatKey = GLOBAL_GROUP_CHAT_KEY;
            } else if (participantIds.length === 2) {
                chatKey = buildDirectKey(participantIds[0], participantIds[1]);
            }

            nextChatIdMap[chatKey] = chat.Id;

            const messagesRaw = await apiRequest(`/chats/${chat.Id}/messages?limit=200`);
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
                (msg) => !msg.read && msg.sender !== userUid,
            ).length;
        }

        setConversations(nextConversations);
        setLastMessages(nextLastMessages);
        setUnreadCounts(nextUnread);
        setChatIdMap(nextChatIdMap);
        setLoadingChats(false);
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
        }, 4000);

        return () => clearInterval(interval);
    }, [currentUser?.uid, currentUser?.role]);

    const markMessagesAsRead = async (chatId, messages) => {
        try {
            const unreadMessages = messages.filter(
                msg => !msg.read && msg.sender !== currentUser.uid
            );

            if (unreadMessages.length === 0) return;
            const actualChatId = chatIdMap[chatId] || chatId;
            for (const message of unreadMessages) {
                await apiRequest(
                    `/chats/${actualChatId}/messages/${message.id}/read`,
                    { method: "POST" },
                );
            }
            updateUnreadCount(chatId, messages.map((msg) =>
                unreadMessages.includes(msg) ? { ...msg, read: true } : msg,
            ));

            // Dismiss any existing toast notifications for this chat
            Toast.hide();
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    // Get sorted chat list
    const getSortedChats = () => {
        return Object.keys(lastMessages)
            .sort((a, b) => {
                const timeA = lastMessages[a]?.toDate?.() || 0;
                const timeB = lastMessages[b]?.toDate?.() || 0;
                return timeB - timeA;
            })
            .map(chatId => ({
                chatId,
                messages: conversations[chatId] || [],
                lastMessageTime: lastMessages[chatId]
            }));
    };

    const ensureDirectChat = async (otherUserId) => {
        const chatKey = buildDirectKey(currentUser?.uid, otherUserId);
        if (chatIdMap[chatKey]) {
            return { chatKey, chatId: chatIdMap[chatKey] };
        }

        const created = await apiRequest("/chats", {
            method: "POST",
            body: {
                isGroup: false,
                participantUserIds: [currentUser?.uid, otherUserId],
            },
        });
        const actualChatId = created?.Id || created?.id;
        if (!actualChatId) {
            throw new Error("Failed to create direct chat.");
        }

        setChatIdMap((prev) => ({ ...prev, [chatKey]: actualChatId }));
        return { chatKey, chatId: actualChatId };
    };

    const ensureGlobalGroupChat = async () => {
        if (chatIdMap[GLOBAL_GROUP_CHAT_KEY]) {
            return {
                chatKey: GLOBAL_GROUP_CHAT_KEY,
                chatId: chatIdMap[GLOBAL_GROUP_CHAT_KEY],
            };
        }

        const usersRaw = await apiRequest("/users");
        const participantUserIds = (usersRaw || [])
            .map((u) => u.Id || u.id)
            .filter(Boolean);

        const created = await apiRequest("/chats", {
            method: "POST",
            body: {
                isGroup: true,
                participantUserIds,
            },
        });
        const actualChatId = created?.Id || created?.id;
        if (!actualChatId) {
            throw new Error("Failed to create group chat.");
        }
        setChatIdMap((prev) => ({
            ...prev,
            [GLOBAL_GROUP_CHAT_KEY]: actualChatId,
        }));
        return { chatKey: GLOBAL_GROUP_CHAT_KEY, chatId: actualChatId };
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
            if (chatKey === GLOBAL_GROUP_CHAT_KEY) {
                resolved = (await ensureGlobalGroupChat()).chatId;
            } else {
                resolved = (await ensureDirectChat(receiverUserId)).chatId;
            }
        }
        const created = await apiRequest(`/chats/${resolved}/messages`, {
            method: "POST",
            body: {
                senderUserId: currentUser?.uid,
                receiverUserId:
                    chatKey === GLOBAL_GROUP_CHAT_KEY ? null : receiverUserId || null,
                type,
                text,
                fileUrl,
                fileName,
            },
        });
        await refreshChatState();
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
                getSortedChats,
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
