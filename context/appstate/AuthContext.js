import React, { useState, createContext, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../../utils/api";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        setCurrentUser(normalizeUser(JSON.parse(savedUser)));
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    };
    hydrate();
  }, []);

  const normalizeUser = (rawUser) => {
    if (!rawUser) return null;
    return {
      ...rawUser,
      // Prefer SQL GUID ids for API calls/chats.
      uid: rawUser.Id || rawUser.id || rawUser.uid,
      id: rawUser.Id || rawUser.id || rawUser.uid,
      displayName: rawUser.displayName || rawUser.DisplayName || "",
      email: rawUser.email || rawUser.Email || "",
      role: rawUser.role || rawUser.Role || "individual",
      phoneNumber: rawUser.phoneNumber || rawUser.PhoneNumber || "",
      region: rawUser.region || rawUser.Region || "",
      registrationNumber:
        rawUser.registrationNumber || rawUser.RegistrationNumber || "",
      physicalAddress: rawUser.physicalAddress || rawUser.PhysicalAddress || "",
      content: rawUser.content || rawUser.Content || "",
      profilePic:
        rawUser.profilePic ||
        rawUser.profilePicUrl ||
        rawUser.ProfilePicUrl ||
        null,
      companyAddress: rawUser.companyAddress || rawUser.CompanyAddress || "",
      locationLat: rawUser.locationLat || rawUser.LocationLat || null,
      locationLng: rawUser.locationLng || rawUser.LocationLng || null,
    };
  };

  const saveSession = async ({ token, user }) => {
    const normalizedUser = normalizeUser(user);
    setCurrentUser(normalizedUser);
    await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const login = async (email, password) => {
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        includeAuth: false,
        body: { email: email.trim().toLowerCase(), password },
      });
      await saveSession({ token: data?.token, user: data?.user });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (registrationPayload) => {
    try {
      const hasProfilePic = !!registrationPayload?.profilePic;
      let body;

      if (hasProfilePic) {
        const formData = new FormData();
        Object.entries(registrationPayload || {}).forEach(([key, value]) => {
          if (key === "profilePic") return;
          if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value);
          }
        });
        formData.append("profilePic", registrationPayload.profilePic);
        body = formData;
      } else {
        body = {
          email: registrationPayload?.email,
          password: registrationPayload?.password,
          role: registrationPayload?.role,
          displayName: registrationPayload?.displayName,
          phoneNumber: registrationPayload?.phoneNumber,
          region: registrationPayload?.region,
          registrationNumber: registrationPayload?.registrationNumber,
          physicalAddress: registrationPayload?.physicalAddress,
          content: registrationPayload?.content,
          companyAddress: registrationPayload?.companyAddress,
          locationLat: registrationPayload?.locationLat,
          locationLng: registrationPayload?.locationLng,
        };
      }

      const data = await apiRequest("/auth/register", {
        method: "POST",
        includeAuth: false,
        body,
      });
      await saveSession({ token: data?.token, user: data?.user });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("user");
    setCurrentUser(null);
  };

  const deleteAccount = async (email, password) => {
    try {
      const verify = await apiRequest("/auth/login", {
        method: "POST",
        includeAuth: false,
        body: { email: email.trim().toLowerCase(), password },
      });

      const userId = verify?.user?.Id || verify?.user?.id || currentUser?.id;
      if (!userId) {
        return { success: false, error: "Unable to resolve user account." };
      }

      await apiRequest(`/users/${userId}`, { method: "DELETE" });
      await logout();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async ({ step, email, token, newPassword }) => {
    try {
      if (step === "request") {
        const data = await apiRequest("/auth/forgot-password/email", {
          method: "POST",
          includeAuth: false,
          body: { email: String(email || "").trim().toLowerCase() },
        });
        return {
          success: true,
          message: data?.message || "Reset email sent. Check your inbox.",
        };
      }

      const data = await apiRequest("/auth/forgot-password/reset", {
        method: "POST",
        includeAuth: false,
        body: {
          email: String(email || "").trim().toLowerCase(),
          token: String(token || "").trim(),
          newPassword: String(newPassword || ""),
        },
      });
      return {
        success: true,
        message: data?.message || "Password reset successful.",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    deleteAccount,
    resetPassword,
    loadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
