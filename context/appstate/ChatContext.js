import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => {
    return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [chatList, setChatList] = useState([]);
    const [conversations, setConversations] = useState({});
    const [loadingChats, setLoadingChats] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const userUid = currentUser.uid;
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
            const users = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setChatList(users);
        });

        // Listen to all chats for which currentUser is a participant
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
                });
            });
            setLoadingChats(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeChats();
        };
    }, [currentUser]);

    // Mark messages as read if they are sent to currentUser and not yet read.
    const markMessagesAsRead = async (chatId, messages) => {
        // Implementation omitted for brevity; you can update each message's status.
    };

    return (
        <ChatContext.Provider
            value={{ chatList, conversations, loadingChats, markMessagesAsRead }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
