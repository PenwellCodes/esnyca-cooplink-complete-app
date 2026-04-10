import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const extra = Constants?.expoConfig?.extra || {};

const REQUEST_TIMEOUT_MS = 15000;

function getDevHostIp() {
  const hostUri =
    Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri || typeof hostUri !== "string") return null;
  const [host] = hostUri.split(":");
  return host || null;
}

function resolveApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (extra.apiBaseUrl) {
    return extra.apiBaseUrl;
  }

  const devHostIp = getDevHostIp();
  if (devHostIp) {
    return `http://${devHostIp}:4000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000/api";
  }
  return "http://localhost:4000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

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

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers: customHeaders = {},
    includeAuth = true,
  } = options;

  const headers = await buildHeaders(customHeaders, includeAuth);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Check backend URL/network. Current API base: ${API_BASE_URL}`,
      );
    }
    throw new Error(
      `Network request failed. Check backend URL/network. Current API base: ${API_BASE_URL}`,
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
