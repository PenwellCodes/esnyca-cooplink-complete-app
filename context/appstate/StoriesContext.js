import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiRequest } from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import {
  CACHE_KEYS,
  readDataCache,
  writeDataCache,
  subscribeNetUsable,
} from "../../utils/dataCache";

const StoriesContext = createContext();
export const useStories = () => useContext(StoriesContext);

const VIEWED_STORIES_KEY = "@viewed_stories";

export const StoriesProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const viewerId = currentUser?.id || currentUser?.uid || "";

  const [stories, setStories] = useState([]);
  const [viewedStories, setViewedStories] = useState({});
  const viewedStoriesRef = useRef({});
  const storiesRef = useRef([]);

  useEffect(() => {
    viewedStoriesRef.current = viewedStories;
  }, [viewedStories]);

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

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

  const saveViewedStories = async (newViewedStories) => {
    try {
      await AsyncStorage.setItem(
        VIEWED_STORIES_KEY,
        JSON.stringify(newViewedStories)
      );
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
    viewedByMe: false,
  });

  const mergeServerIntoStories = useCallback((activeStories, prevList) => {
    const prevById = new Map((prevList || []).map((s) => [s.id, s]));
    const vs = viewedStoriesRef.current || {};
    const vid = viewerId ? String(viewerId).toLowerCase() : "";

    return (activeStories || []).map((item) => {
      const next = normalizeStory(item);
      const old = prevById.get(next.id);
      const viewKey = `${next.id}_${viewerId || "anon"}`;
      const hasViewedLocally = vs[viewKey] === true;
      const hasViewedInBackend =
        !!vid &&
        Array.isArray(next.views) &&
        next.views.some((v) => String(v).toLowerCase() === vid);

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
  }, [viewerId]);

  const loadStories = useCallback(async () => {
    try {
      const activeStories = await apiRequest("/stories/active");
      const next = mergeServerIntoStories(activeStories, storiesRef.current);
      setStories(next);
      try {
        await writeDataCache(CACHE_KEYS.STORIES_ACTIVE, next);
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error("Error loading stories:", error);
      const cached = await readDataCache(CACHE_KEYS.STORIES_ACTIVE);
      if (Array.isArray(cached) && cached.length) {
        setStories((prev) => (prev.length ? prev : cached));
      }
    }
  }, [mergeServerIntoStories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readDataCache(CACHE_KEYS.STORIES_ACTIVE);
      if (!cancelled && Array.isArray(cached) && cached.length) {
        setStories(cached);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadStories().catch(() => {});
    const interval = setInterval(() => {
      loadStories().catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [loadStories]);

  useEffect(() => {
    return subscribeNetUsable(() => {
      loadStories().catch(() => {});
    });
  }, [loadStories]);

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

  const recordView = useCallback(
    async (storyId, viewerIdArg) => {
      const vid = viewerIdArg || viewerId;
      if (!storyId || !vid) return;

      try {
        await apiRequest(`/stories/${storyId}/views`, {
          method: "POST",
          body: { viewerUserId: vid },
        });

        const viewKey = `${storyId}_${vid}`;
        const updatedViewedStories = {
          ...viewedStoriesRef.current,
          [viewKey]: true,
        };
        setViewedStories(updatedViewedStories);
        await saveViewedStories(updatedViewedStories);

        setStories((prev) =>
          prev.map((story) => {
            if (story.id !== storyId) return story;
            const nextViews = Array.isArray(story.views) ? [...story.views] : [];
            if (!nextViews.includes(vid)) nextViews.push(vid);
            return {
              ...story,
              views: nextViews,
              viewedByMe: true,
            };
          })
        );
      } catch (error) {
        console.error("Error recording story view:", error);
        const viewKey = `${storyId}_${vid}`;
        const updatedViewedStories = {
          ...viewedStoriesRef.current,
          [viewKey]: true,
        };
        setViewedStories(updatedViewedStories);
        await saveViewedStories(updatedViewedStories);
      }
    },
    [viewerId]
  );

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

  return (
    <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
  );
};

export default StoriesContext;
