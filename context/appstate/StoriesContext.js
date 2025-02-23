import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const StoriesContext = createContext();
export const useStories = () => useContext(StoriesContext);

export const StoriesProvider = ({ children }) => {
    const [stories, setStories] = useState([]);

    useEffect(() => {
        // Create a cutoff timestamp for stories less than 24 hours old
        const now = new Date();
        const cutoff = Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 3000));
        const q = query(collection(db, "stories"), where("createdAt", ">", cutoff));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedStories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setStories(fetchedStories);
        });
        return () => unsubscribe();
    }, []);

    // Function to post a story with image upload and Firestore document creation
    const postStory = async ({ imageURI, caption, userId }) => {
        try {
            const response = await fetch(imageURI);
            const blob = await response.blob();
            const storageRef = ref(storage, `stories/${userId}_${Date.now()}`);
            const uploadTask = uploadBytesResumable(storageRef, blob);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        // Optionally, you can track upload progress here if needed
                    },
                    (error) => reject(error),
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        // Save story metadata to Firestore, using serverTimestamp for createdAt
                        const storyDoc = await addDoc(collection(db, "stories"), {
                            userId,
                            imageURL: downloadURL,
                            caption,
                            createdAt: serverTimestamp(),
                            views: [],
                        });
                        resolve(storyDoc.id);
                    }
                );
            });
        } catch (error) {
            console.error("Error posting story:", error);
            throw error;
        }
    };

    // Placeholder for recording a view
    const recordView = async (storyId, viewerId) => {
        // Add logic here to add the viewerId to the story’s 'views' array if not already present
    };

    const value = { stories, postStory, recordView };
    return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
};

export default StoriesContext;
