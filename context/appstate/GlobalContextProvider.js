import React from "react";
import { AuthProvider } from "../appstate/AuthContext";
import { ChatProvider } from "../appstate/ChatContext"; // Ensure correct import

const GlobalContextProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </AuthProvider>
  );
};

export default GlobalContextProvider;
