import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
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


    const [userMap, setUserMap] = useState({});



    
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
                newUserMap[user.uid] = user;
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

                // Subscribe to messages for each chat
                onSnapshot(messagesQuery, (messagesSnapshot) => {
                    const messages = messagesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    // For group chats (chatId starting with "group_"), show all messages
                    // For individual chats, keep existing behavior
                    if (chatId.startsWith('group_') || 
                        messages.some(msg => 
                            msg.sender === currentUser.uid || 
                            msg.receiver === currentUser.uid
                        )) {
                        chatsData[chatId] = messages;
                        setConversations({ ...chatsData });
                    }

                    // Check for new incoming messages (toast notification)
                    messagesSnapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const newMessage = change.doc.data();
                            if (
                                newMessage.sender !== currentUser.uid &&
                                chatId !== activeChatId
                            ) {
                                const sender = userMap[newMessage.sender];
                                if (sender) {
                                    Toast.show({
                                        type: "info",
                                        text1: `🆕 New message from ${sender.displayName}`,
                                        position: "top",
                                        visibilityTime: 4000,
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
        // Your existing implementation
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
                userMap, // Exposing userMap for group chat sender details
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
