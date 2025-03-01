import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "../../context/appstate/AuthContext";

const AuthLayout = () => {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <>
      <Stack>
        <Stack.Screen
          name="welcome"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
          }}
        />
       
      </Stack>
    </>
  );
};

export default AuthLayout;
