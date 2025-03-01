import React, { useState, createContext, useContext, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  // Helper function to fetch additional user data from Firestore
  const fetchUserDetails = async (uid) => {
    try {
      const q = query(
        collection(db, "users"),
        where("uid", "==", uid)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Assuming only one document per user uid
        return querySnapshot.docs[0].data();
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userFromAuth) => {
      if (userFromAuth) {
        // Fetch additional details from Firestore
        const additionalData = await fetchUserDetails(userFromAuth.uid);
        // Merge Firebase Auth data with additional Firestore data
        const completeUser = additionalData
          ? { ...userFromAuth, ...additionalData }
          : userFromAuth;
        setCurrentUser(completeUser);
        console.log("Current user:", completeUser);
        await AsyncStorage.setItem("user", JSON.stringify(completeUser));
      } else {
        setCurrentUser(null);
        console.log("No user is signed in.");masiko
        await AsyncStorage.removeItem("user");
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userFromAuth = userCredential.user;
      const additionalData = await fetchUserDetails(userFromAuth.uid);
      const completeUser = additionalData
        ? { ...userFromAuth, ...additionalData }
        : userFromAuth;
      setCurrentUser(completeUser);
      await AsyncStorage.setItem("user", JSON.stringify(completeUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    login,
    loadingAuth,
    auth,
    resetPassword, // Add this line
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;