import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, AppState, Platform } from "react-native";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from "expo-tracking-transparency";
import { supabase } from "./lib/supabase";
import CalorieTrackerScreen from "./screens/CalorieTrackerScreen";
import AuthScreen from "./screens/AuthScreen";
import AboutScreen from "./screens/AboutScreen";

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#5b8cff",
    primaryContainer: "#141414",
    background: "#000000",
    surface: "#0d0d0d",
    surfaceVariant: "#141414",
    outline: "#1a1a1a",
    error: "#f87171",
    onPrimary: "#ffffff",
    onBackground: "#e8ecff",
    onSurface: "#e8ecff",
    onSurfaceVariant: "#8899bb",
    inverseSurface: "#e8ecff",
    inverseOnSurface: "#0b1020",
  },
};

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#3b6cff",
    primaryContainer: "#e0e7ff",
    background: "#fafafa",
    surface: "#ffffff",
    surfaceVariant: "#f0f0f5",
    outline: "#d0d0dd",
    error: "#dc2626",
    onPrimary: "#ffffff",
    onBackground: "#111827",
    onSurface: "#111827",
    onSurfaceVariant: "#6b7280",
    inverseSurface: "#111827",
    inverseOnSurface: "#fafafa",
  },
};

export type RootStackParamList = {
  CalorieTracker: undefined;
  Auth: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(Boolean(s)));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let requested = false;
    const requestATT = async () => {
      if (requested) return;
      requested = true;
      try {
        const { status } = await getTrackingPermissionsAsync();
        console.log("[ATT] initial status:", status);
        if (status === "undetermined") {
          const req = await requestTrackingPermissionsAsync();
          console.log("[ATT] requested, new status:", req.status);
        }
      } catch (e: any) {
        console.log("[ATT] error:", e?.message || e);
      }
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") requestATT();
    });
    if (AppState.currentState === "active") requestATT();

    return () => subscription.remove();
  }, []);

  if (session === null) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b1020" }}><ActivityIndicator color="#5b8cff" /></View>;
  }

  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <NavigationContainer>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? darkTheme.colors.background : lightTheme.colors.background } }}>
        <Stack.Screen name="CalorieTracker">
          {(props) => (
            <CalorieTrackerScreen isLoggedIn={session} onSignIn={() => props.navigation.navigate("Auth")} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} navigation={props.navigation} />
          )}
        </Stack.Screen>
        <Stack.Screen name="About">
          {(props) => (
            <AboutScreen onBack={() => props.navigation.goBack()} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {(props) => (
            <AuthScreen onAuthenticated={() => { setSession(true); props.navigation.goBack(); }} onBack={() => props.navigation.goBack()} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
    </PaperProvider>
  );
}
