import Constants from "expo-constants";
import Toast from "react-native-toast-message";

let lastError = null;
let installed = false;

export function shouldShowProductionErrors() {
  if (__DEV__) return true;
  return Constants.expoConfig?.extra?.showProductionErrors === true;
}

export function getLastError() {
  return lastError;
}

export function recordError(error, context = "") {
  const normalized = {
    message: error?.message || String(error),
    stack: error?.stack || null,
    context,
    at: new Date().toISOString(),
  };
  lastError = normalized;
  console.error("[AppError]", context || "error", normalized.message, error?.stack);
  return normalized;
}

export function showErrorToast(error, title = "Error") {
  if (!shouldShowProductionErrors()) return;
  const message = error?.message || String(error);
  const text2 = message.length > 140 ? `${message.slice(0, 137)}...` : message;
  Toast.show({
    type: "error",
    text1: title,
    text2,
    visibilityTime: 10000,
    position: "top",
  });
}

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  const ErrorUtils = global.ErrorUtils;
  if (ErrorUtils?.getGlobalHandler && ErrorUtils?.setGlobalHandler) {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      recordError(error, isFatal ? "fatal" : "js");
      showErrorToast(error, isFatal ? "Fatal error" : "Error");
      defaultHandler?.(error, isFatal);
    });
  }

  try {
    const tracking = require("promise/setimmediate/rejection-tracking");
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id, error = {}) => {
        recordError(error, "unhandledRejection");
        showErrorToast(error, "Unhandled error");
      },
      onHandled: () => {},
    });
  } catch (error) {
    console.warn("Promise rejection tracking not available:", error?.message);
  }
}
