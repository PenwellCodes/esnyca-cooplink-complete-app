import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db, storage } from "../../firebase/firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL, ref as storageRef, deleteObject } from "firebase/storage";

const StoriesContext = createContext();
export const useStories = () => useContext(StoriesContext);

export const StoriesProvider = ({ children }) => {
    const [stories, setStories] = useState([]);

    useEffect(() => {
        // Create a cutoff timestamp for stories less than 3 minutes old
        const now = new Date();
        const cutoff = Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
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
            let downloadURL = null;
            
            if (imageURI) {
                const response = await fetch(imageURI);
                const blob = await response.blob();
                const storageRef = ref(storage, `stories/${userId}_${Date.now()}`);
                const uploadTask = uploadBytesResumable(storageRef, blob);

                downloadURL = await new Promise((resolve, reject) => {
                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {},
                        (error) => reject(error),
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        }
                    );
                });
            }

            const storyData = {
                userId,
                caption,
                createdAt: serverTimestamp(),
                views: [],
            };

            if (downloadURL) {
                storyData.imageURL = downloadURL;
            }

            const storyDoc = await addDoc(collection(db, "stories"), storyData);
            return storyDoc.id;
        } catch (error) {
            console.error("Error posting story:", error);
            throw error;
        }
    };

    // Placeholder for recording a view
    const recordView = async (storyId, viewerId) => {
        // Add logic here to add the viewerId to the story’s 'views' array if not already present
    };

    const deleteStory = async (storyId, imageURL) => {
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, "stories", storyId));
            
            // Delete the image from Storage
            const imageRef = storageRef(storage, imageURL);
            await deleteObject(imageRef);
            
            return true;
        } catch (error) {
            console.error("Error deleting story:", error);
            throw error;
        }
    };

    const value = { stories, postStory, recordView, deleteStory };
    return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
};

export default StoriesContext;
