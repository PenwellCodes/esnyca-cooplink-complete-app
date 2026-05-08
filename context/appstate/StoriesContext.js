import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { apiRequest } from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const StoriesContext = createContext();
export const useStories = () => useContext(StoriesContext);

// Key for storing viewed stories in local storage
const VIEWED_STORIES_KEY = "@viewed_stories";

export const StoriesProvider = ({ children }) => {
    const [stories, setStories] = useState([]);
    const [viewedStories, setViewedStories] = useState({}); // Store locally viewed stories
    const [currentUser, setCurrentUser] = useState(null); // We'll get this from AuthContext

    // Load viewed stories from local storage on app start
    useEffect(() => {
        const loadViewedStories = async () => {
            try {
                const saved = await AsyncStorage.getItem(VIEWED_STORIES_KEY);
                if (saved) {
                    setViewedStories(JSON.parse(saved));
                }
            } catch (error) {
                console.error("Error loading viewed stories:", error);
            }
        };
        loadViewedStories();
    }, []);

    // Save viewed stories to local storage whenever they change
    const saveViewedStories = async (newViewedStories) => {
        try {
            await AsyncStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(newViewedStories));
        } catch (error) {
            console.error("Error saving viewed stories:", error);
        }
    };

    const normalizeStory = (item) => ({
        id: item.Id || item.id,
        userId: item.UserId || item.userId,
        imageURL: item.ImageUrl || item.imageUrl,
        caption: item.Caption || item.caption || "",
        createdAt: item.CreatedAt || item.createdAt,
        expiresAt: item.ExpiresAt || item.expiresAt,
        views: item.views || [],
        viewedByMe: false, // Add a flag for current user's view status
    });

    const loadStories = async () => {
        try {
            const activeStories = await apiRequest("/stories/active");
            
            // Get current user from somewhere (you can also import useAuth here)
            // For now, we'll assume you have a way to get current user
            // If not, you'll need to get it from AuthContext
            
            setStories((prev) => {
                const prevById = new Map((prev || []).map((s) => [s.id, s]));
                return (activeStories || []).map((item) => {
                    const next = normalizeStory(item);
                    const old = prevById.get(next.id);
                    
                    // Check if this story has been viewed by current user (from local storage)
                    // You'll need to pass currentUser.uid properly
                    // For now, we'll use a placeholder - you should integrate with your AuthContext
                    const viewKey = `${next.id}_temp_user`; // Replace with actual user ID
                    const hasViewedLocally = viewedStories[viewKey] === true;
                    
                    // Check if views array already contains the user
                    const hasViewedInBackend = false; // Check if user ID is in views
                    
                    let finalViews = next.views;
                    if (old && Array.isArray(old.views) && old.views.length > 0) {
                        finalViews = old.views;
                    }
                    
                    return { 
                        ...next, 
                        views: finalViews,
                        viewedByMe: hasViewedLocally || hasViewedInBackend,
                    };
                });
            });
        } catch (error) {
            console.error("Error loading stories:", error);
        }
    };

    useEffect(() => {
        loadStories().catch((error) => {
            console.error("Error loading stories:", error);
        });
        const interval = setInterval(() => {
            loadStories().catch(() => {});
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Function to post a story with image upload and Firestore document creation
    const postStory = async ({ imageURI, caption, userId }) => {
        try {
            if (!imageURI) {
                throw new Error("Story image is required.");
            }
            const formData = new FormData();
            formData.append("image", {
                uri: imageURI,
                name: `story-${Date.now()}.jpg`,
                type: "image/jpeg",
            });
            const uploadResult = await apiRequest("/upload", {
                method: "POST",
                body: formData,
            });

            const created = await apiRequest("/stories", {
                method: "POST",
                body: {
                    userId,
                    imageUrl: uploadResult?.imageUrl,
                    caption: caption || "",
                },
            });

            await loadStories();
            return created?.Id || created?.id;
        } catch (error) {
            console.error("Error posting story:", error);
            throw error;
        }
    };

    const recordView = useCallback(async (storyId, viewerId) => {
        if (!storyId || !viewerId) return;
        
        try {
            // Send view to backend
            await apiRequest(`/stories/${storyId}/views`, {
                method: "POST",
                body: { viewerUserId: viewerId },
            });
            
            // Update local storage to remember this user viewed this story
            const viewKey = `${storyId}_${viewerId}`;
            const updatedViewedStories = {
                ...viewedStories,
                [viewKey]: true,
            };
            setViewedStories(updatedViewedStories);
            await saveViewedStories(updatedViewedStories);
            
            // Update local state
            setStories((prev) =>
                prev.map((story) => {
                    if (story.id !== storyId) return story;
                    const nextViews = Array.isArray(story.views) ? [...story.views] : [];
                    if (!nextViews.includes(viewerId)) nextViews.push(viewerId);
                    return { 
                        ...story, 
                        views: nextViews,
                        viewedByMe: true,
                    };
                }),
            );
        } catch (error) {
            console.error("Error recording story view:", error);
            // Still update local storage even if backend fails
            const viewKey = `${storyId}_${viewerId}`;
            const updatedViewedStories = {
                ...viewedStories,
                [viewKey]: true,
            };
            setViewedStories(updatedViewedStories);
            await saveViewedStories(updatedViewedStories);
        }
    }, [viewedStories]);

    const deleteStory = async (storyId) => {
        try {
            await apiRequest(`/stories/${storyId}`, { method: "DELETE" });
            setStories((prev) => prev.filter((story) => story.id !== storyId));
            return true;
        } catch (error) {
            console.error("Error deleting story:", error);
            throw error;
        }
    };

    const value = { 
        stories, 
        postStory, 
        recordView, 
        deleteStory,
        refreshStories: loadStories,
    };
    
    return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
};

export default StoriesContext;