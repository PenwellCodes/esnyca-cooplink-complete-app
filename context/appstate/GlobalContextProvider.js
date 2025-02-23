import React from "react";
import { AuthProvider } from "../appstate/AuthContext";
import { ChatProvider } from "../appstate/ChatContext"; // Ensure correct import
import { StoriesProvider } from "../appstate/StoriesContext"; // Ensure correct import

const GlobalContextProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ChatProvider>
        <StoriesProvider>
          {children}
        </StoriesProvider>
      </ChatProvider>
    </AuthProvider>
  );
};

export default GlobalContextProvider;
