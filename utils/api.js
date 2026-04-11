import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL as CONFIGURED_API_BASE_URL } from "./apiConfig";

const REQUEST_TIMEOUT_MS = 15000;

export const API_BASE_URL = String(CONFIGURED_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

if (!API_BASE_URL) {
  throw new Error("❌ API base URL missing. Set it in utils/apiConfig.js");
}

/**
 * Build headers (with optional auth token)
 */
async function buildHeaders(customHeaders = {}, includeAuth = true) {
  const headers = { ...customHeaders };

  if (includeAuth) {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
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
  } = options;

  const headers = await buildHeaders(customHeaders, includeAuth);

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // Set JSON header only if not FormData
  if (!isFormData && body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        `⏱ Request timed out after ${
          REQUEST_TIMEOUT_MS / 1000
        }s. Check server/network.`
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
    throw error;
  }

  return data;
}