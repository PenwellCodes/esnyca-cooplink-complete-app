import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { apiRequest } from "../../utils/api";

const StoriesContext = createContext();
export const useStories = () => useContext(StoriesContext);

export const StoriesProvider = ({ children }) => {
    const [stories, setStories] = useState([]);

    const normalizeStory = (item) => ({
        id: item.Id || item.id,
        userId: item.UserId || item.userId,
        imageURL: item.ImageUrl || item.imageUrl,
        caption: item.Caption || item.caption || "",
        createdAt: item.CreatedAt || item.createdAt,
        expiresAt: item.ExpiresAt || item.expiresAt,
        views: item.views || [],
    });

    const loadStories = async () => {
        const activeStories = await apiRequest("/stories/active");
        setStories((prev) => {
            const prevById = new Map((prev || []).map((s) => [s.id, s]));
            return (activeStories || []).map((item) => {
                const next = normalizeStory(item);
                const old = prevById.get(next.id);
                if (old && Array.isArray(old.views) && old.views.length > 0) {
                    return { ...next, views: old.views };
                }
                return next;
            });
        });
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
        try {
            await apiRequest(`/stories/${storyId}/views`, {
                method: "POST",
                body: { viewerUserId: viewerId },
            });
            setStories((prev) =>
                prev.map((story) => {
                    if (story.id !== storyId) return story;
                    const nextViews = Array.isArray(story.views) ? [...story.views] : [];
                    if (!nextViews.includes(viewerId)) nextViews.push(viewerId);
                    return { ...story, views: nextViews };
                }),
            );
        } catch (error) {
            console.error("Error recording story view:", error);
        }
    }, []);

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

    const value = { stories, postStory, recordView, deleteStory };
    return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
};

export default StoriesContext;
