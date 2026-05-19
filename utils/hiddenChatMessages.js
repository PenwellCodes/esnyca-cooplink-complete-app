import AsyncStorage from "@react-native-async-storage/async-storage";

function hiddenKeyForUser(userId) {
  const id = userId == null ? "" : String(userId).trim().toLowerCase();
  return `@esnyca_hidden_msgs_v1_${id}`;
}

/** @returns {Record<string, string[]>} chatKey -> message ids */
export async function readHiddenMessages(userId) {
  try {
    const raw = await AsyncStorage.getItem(hiddenKeyForUser(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeHiddenMessages(userId, map) {
  try {
    await AsyncStorage.setItem(hiddenKeyForUser(userId), JSON.stringify(map || {}));
  } catch (e) {
    console.warn("writeHiddenMessages:", e?.message || e);
  }
}

export function filterVisibleMessages(chatKey, messages, hiddenMap) {
  if (!chatKey || !Array.isArray(messages)) return messages || [];
  const hidden = new Set((hiddenMap?.[chatKey] || []).map(String));
  if (!hidden.size) return messages;
  return messages.filter((m) => m?.id != null && !hidden.has(String(m.id)));
}
