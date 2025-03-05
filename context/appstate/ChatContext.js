import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import Toast from "react-native-toast-message";

const ChatContext = createContext();

export const useChat = () => {
    return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [chatList, setChatList] = useState([]);
    const [conversations, setConversations] = useState({});
    const [loadingChats, setLoadingChats] = useState(true);
    const [activeChatId, setActiveChatId] = useState(null);
    const [lastMessages, setLastMessages] = useState({});
    const [userMap, setUserMap] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});

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

    useEffect(() => {
        if (!currentUser) {
            setConversations({});
            setLastMessages({});
            setUnreadCounts({});
            return;
        }

        const userUid = currentUser.uid;

        // First fetch all existing users
        const fetchAndValidateUsers = async () => {
            const existingUsers = new Set();
            const usersQuery = query(collection(db, "users"));
            const snapshot = await getDocs(usersQuery);
            snapshot.forEach(doc => {
                existingUsers.add(doc.data().uid);
            });
            return existingUsers;
        };

        // Modified users query listener
        let usersQuery;
        if (currentUser.role === "cooperative") {
            usersQuery = query(collection(db, "users"), where("uid", "!=", userUid));
        } else {
            usersQuery = query(
                collection(db, "users"),
                where("role", "==", "cooperative"),
                where("uid", "!=", userUid)
            );
        }

        const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
            const existingUsers = await fetchAndValidateUsers();
            const users = snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                .filter(user => existingUsers.has(user.uid)); // Filter out non-existent users

            const newUserMap = {};
            users.forEach((user) => {
                newUserMap[user.uid] = user;
            });
            
            setChatList(users);
            setUserMap(newUserMap);

            // Cleanup conversations for non-existent users
            const currentChats = { ...conversations };
            Object.keys(currentChats).forEach(chatId => {
                const [uid1, uid2] = chatId.split('_');
                const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;
                if (!existingUsers.has(otherUserId)) {
                    delete currentChats[chatId];
                }
            });
            setConversations(currentChats);
        });

        // Listen to chats
        const chatsQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", userUid)
        );

        const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
            snapshot.docs.forEach((chatDoc) => {
                const chatId = chatDoc.id;
                const messagesQuery = query(
                    collection(db, "chats", chatId, "messages"),
                    orderBy("timestamp", "desc")
                );

                // Subscribe to messages for each chat
                onSnapshot(messagesQuery, (messagesSnapshot) => {
                    const messages = messagesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    // Update conversations and last messages
                    setConversations(prev => ({
                        ...prev,
                        [chatId]: messages.reverse()
                    }));

                    if (messages.length > 0) {
                        setLastMessages(prev => ({
                            ...prev,
                            [chatId]: messages[0].timestamp
                        }));
                    }

                    // Update unread count
                    const unreadCount = updateUnreadCount(chatId, messages);

                    // Check for new messages and show toast
                    messagesSnapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const newMessage = change.doc.data();
                            if (
                                newMessage.sender !== currentUser.uid &&
                                chatId !== activeChatId &&
                                !newMessage.read
                            ) {
                                const sender = userMap[newMessage.sender];
                                if (sender) {
                                    Toast.show({
                                        type: "info",
                                        text1: `New message from ${sender.displayName}`,
                                        text2: `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
                                        position: "top",
                                        visibilityTime: 3000,
                                        autoHide: true,
                                    });
                                }
                            }
                        }
                    });
                });
            });
            setLoadingChats(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeChats();
        };
    }, [currentUser, activeChatId]);

    const markMessagesAsRead = async (chatId, messages) => {
        try {
            const unreadMessages = messages.filter(
                msg => !msg.read && msg.sender !== currentUser.uid
            );

            if (unreadMessages.length === 0) return;

            const batch = writeBatch(db);
            
            for (const message of unreadMessages) {
                if (message.id) {
                    const messageRef = doc(db, "chats", chatId, "messages", message.id);
                    batch.update(messageRef, { read: true });
                }
            }

            await batch.commit();
            
            // Update local unread count
            updateUnreadCount(chatId, messages.map(msg => 
                unreadMessages.includes(msg) ? { ...msg, read: true } : msg
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
                unreadCounts
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
