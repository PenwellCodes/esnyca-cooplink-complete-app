import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import Toast from 'react-native-toast-message';
import { Text } from "react-native";

const ChatContext = createContext();

export const useChat = () => {
    return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [chatList, setChatList] = useState([]);
    const [conversations, setConversations] = useState({});
    const [loadingChats, setLoadingChats] = useState(true);
    const [activeChatId, setActiveChatId] = useState(null); // New state for active chat
    const [userMap, setUserMap] = useState({}); // New state for UID-to-user mapping

    useEffect(() => {
        if (!currentUser) return;

        const userUid = currentUser.uid;

        // Fetch users for chat list and create userMap
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

        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            const newUserMap = {};
            users.forEach((user) => {
                newUserMap[user.uid] = user; // Map UID to user object
            });
            setChatList(users);
            setUserMap(newUserMap);
        });

        // Listen to chats where currentUser is a participant
        const chatsQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", userUid)
        );

        const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
            let chatsData = { ...conversations };
            snapshot.docs.forEach((chatDoc) => {
                const chatId = chatDoc.id;
                const messagesQuery = query(
                    collection(db, "chats", chatId, "messages"),
                    orderBy("timestamp", "asc")
                );
                onSnapshot(messagesQuery, (messagesSnapshot) => {
                    const messages = messagesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    chatsData[chatId] = messages;
                    setConversations({ ...chatsData });

                    // Check for new incoming messages
                    messagesSnapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const newMessage = change.doc.data();
                            // Show toast if message is from another user and chat isn’t active
                            if (
                                newMessage.sender !== currentUser.uid &&
                                chatId !== activeChatId
                            ) {
                                const sender = userMap[newMessage.sender];
                                if (sender) {
                                    Toast.show({
                                        type: "info",
                                        text1: `New message from ${sender.displayName}`,
                                        position: "top",
                                        visibilityTime: 4000,
                                        text1Style: { fontSize: 10 },
                                        style: {
                                            backgroundColor: "#00AAFF",
                                            width: 20,           // Set equal width
                                            height: 50,          // and height
                                            borderRadius: 100,    // half of width/height for a circle
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        },
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
    }, [currentUser, activeChatId]); // Re-run when activeChatId changes

    const markMessagesAsRead = async (chatId, messages) => {
        // Implementation remains unchanged
    };

    return (
        <ChatContext.Provider
            value={{
                chatList,
                conversations,
                loadingChats,
                markMessagesAsRead,
                activeChatId,
                setActiveChatId, // Expose setActiveChatId for ChatScreen
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
