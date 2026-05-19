import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

/** Stable JSON blobs shared across screens (raw API payloads where possible). */
export const CACHE_KEYS = {
  USERS: "@esnyca_cache_users_v1",
  NEWS: "@esnyca_cache_news_v1",
  PARTNERS: "@esnyca_cache_partners_v1",
  TEAM: "@esnyca_cache_team_v1",
  STORIES_ACTIVE: "@esnyca_cache_stories_active_v1",
};

export function chatStateCacheKey(userId) {
  const id = userId == null ? "" : String(userId).trim().toLowerCase();
  return `@esnyca_cache_chat_state_v1_${id}`;
}

export function isNetUsable(state) {
  if (!state) return false;
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/**
 * Subscribe to transitions into a usable network state (e.g. after outage).
 * Ignores events until the first `NetInfo.fetch()` completes so cold start does not fire a false recover.
 * @param {() => void} onUsable
 * @returns {() => void} unsubscribe
 */
export function subscribeNetUsable(onUsable) {
  let baselineReady = false;
  let lastUsable = true;

  const apply = (state) => {
    const usable = isNetUsable(state);
    if (!baselineReady) return;
    if (usable && !lastUsable) {
      try {
        onUsable();
      } catch (e) {
        console.warn("subscribeNetUsable callback:", e?.message || e);
      }
    }
    lastUsable = usable;
  };

  const unsub = NetInfo.addEventListener(apply);
  NetInfo.fetch()
    .then((s) => {
      lastUsable = isNetUsable(s);
      baselineReady = true;
    })
    .catch(() => {
      baselineReady = true;
    });

  return unsub;
}

export async function readDataCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeDataCache(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("writeDataCache failed:", key, e?.message || e);
  }
}

export async function clearDataCache(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
