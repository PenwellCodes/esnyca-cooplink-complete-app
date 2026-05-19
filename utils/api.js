import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL as CONFIGURED_API_BASE_URL } from "./apiConfig";

const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_REQUEST_TIMEOUT_MS = 60000;
const CHAT_SEND_TIMEOUT_MS = 45000;

export const API_BASE_URL = String(CONFIGURED_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

if (!API_BASE_URL) {
  throw new Error("❌ API base URL missing. Set it in utils/apiConfig.js");
}

/**
 * Build headers with optional user identity.
 */
async function buildHeaders(customHeaders = {}, includeAuth = true) {
  const headers = { ...customHeaders };

  if (includeAuth) {
    let token = await AsyncStorage.getItem("authToken");
    if (!token) {
      // Backward compatibility for older app sessions.
      token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("jwtToken")) ||
        null;
      if (token) {
        await AsyncStorage.setItem("authToken", token);
      }
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const userRaw = await AsyncStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        const uid = user?.id || user?.Id || user?.uid;
        if (uid) {
          headers["x-user-id"] = String(uid);
        }
        if (user?.role) {
          headers["x-user-role"] = String(user.role);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return headers;
}

/**
 * Main API request handler
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers: customHeaders = {},
    includeAuth = true,
    timeoutMs,
  } = options;

  const headers = await buildHeaders(customHeaders, includeAuth);

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const isChatSendRequest =
    normalizedMethod === "POST" && /\/chats\/[^/]+\/messages$/.test(path);

  // Set JSON header only if not FormData
  if (!isFormData && body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const resolvedTimeoutMs =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? timeoutMs
      : path.includes("/upload")
      ? UPLOAD_REQUEST_TIMEOUT_MS
      : isChatSendRequest
      ? CHAT_SEND_TIMEOUT_MS
      : REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), resolvedTimeoutMs);

  let response;

  try {
    const url = `${API_BASE_URL}${path}`;
    console.log("🌐 API Request:", url);

    response = await fetch(url, {
      method,
      headers,
      body: isFormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `⏱ Request timed out after ${Math.round(
          resolvedTimeoutMs / 1000
        )}s. Check server/network.`
      );
    }

    throw new Error(
      `❌ Network request failed. Check server URL or internet connection.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;

    // Handle 401 globally - token expired
    if (response.status === 401) {
      // Clear stored auth data
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("jwtToken");
      await AsyncStorage.removeItem("user");
      // Note: We can't call logout here as it would create a circular dependency
      // The AuthContext will handle setting currentUser to null when it detects no user
    }

    throw error;
  }

  return data;
}