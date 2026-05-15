import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import {
  getLastError,
  recordError,
  shouldShowProductionErrors,
} from "../utils/productionErrors";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    recordError(error, "ErrorBoundary");
    console.error("ErrorBoundary caught:", error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack || null });
  }

  render() {
    if (this.state.error) {
      const showDetails = shouldShowProductionErrors();
      const lastError = getLastError();
      const detailText = [
        this.state.error?.message || String(this.state.error),
        showDetails && this.state.error?.stack ? `\n\n${this.state.error.stack}` : "",
        showDetails && this.state.componentStack
          ? `\n\nComponent stack:${this.state.componentStack}`
          : "",
        showDetails && lastError?.context && lastError.context !== "ErrorBoundary"
          ? `\n\nLast global: [${lastError.context}] ${lastError.message}`
          : "",
      ].join("");

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message} selectable={showDetails}>
              {detailText}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1C1B1F",
  },
  scroll: {
    maxHeight: 240,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: "#B3261E",
  },
  button: {
    backgroundColor: "#00AAFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default ErrorBoundary;
