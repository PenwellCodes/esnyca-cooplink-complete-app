import React from "react";
import { AuthProvider } from "../appstate/AuthContext";
import { ChatProvider } from "../appstate/ChatContext"; // Ensure correct import
import { StoriesProvider } from "../appstate/StoriesContext"; // Ensure correct import
import { CustomThemeProvider } from "../appstate/CustomThemeProvider"; // Ensure correct import

const GlobalContextProvider = ({ children }) => {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <StoriesProvider>
            {children}
          </StoriesProvider>
        </ChatProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
};

export default GlobalContextProvider;
