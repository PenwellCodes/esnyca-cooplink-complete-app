import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

/**
 * Wraps content with loading spinner or network error + retry.
 */
export default function FetchState({
  loading = false,
  error = null,
  onRetry,
  loadingText = "Loading...",
  errorText = "Unable to load data. Please check your internet connection and try again.",
  retryText = "Try again",
  children,
  showLoadingOverlay = false,
  color = "#007AFF",
}) {
  const showLoading =
    loading && (showLoadingOverlay || !children || React.Children.count(children) === 0);

  if (showLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color} />
        <Text style={styles.hint}>{loadingText}</Text>
      </View>
    );
  }

  if (error && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText}</Text>
        {onRetry ? (
          <TouchableOpacity onPress={onRetry} style={[styles.button, { backgroundColor: color }]}>
            <Text style={styles.buttonText}>{retryText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (loading && children) {
    return (
      <View style={styles.flex}>
        {children}
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.hint}>{loadingText}</Text>
        </View>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  hint: {
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
    color: "#666",
  },
  error: {
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    lineHeight: 22,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
});
