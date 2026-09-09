import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { supabase } from "./lib/supabase";
import { REVENUECAT_ANDROID_KEY } from "./lib/config";
import { getDeviceId } from "./lib/device";
import Purchases from "react-native-purchases";
import CalorieTrackerScreen from "./screens/CalorieTrackerScreen";
import AuthScreen from "./screens/AuthScreen";
import AboutScreen from "./screens/AboutScreen";
import SubscriptionScreen from "./screens/SubscriptionScreen";
import AIConsentScreen from "./screens/AIConsentScreen";
import LanguageChooser from "./screens/LanguageChooser";

const AI_CONSENT_KEY = "freesurf-calorie-ai-consent-v1";
import { useAppLanguage } from "./i18n";

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
  Subscription: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { loaded: langLoaded, chosen: langChosen, setLanguage } = useAppLanguage();
  const [session, setSession] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [aiConsent, setAiConsent] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AI_CONSENT_KEY).then((v) => setAiConsent(v === "true")).catch(() => setAiConsent(false));
  }, []);

  const agreeAiConsent = async () => {
    setAiConsent(true);
    AsyncStorage.setItem(AI_CONSENT_KEY, "true").catch(() => {});
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(Boolean(s)));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Configure RevenueCat (Google Play) once at launch when a real SDK key is present.
  // appUserID = device id so the worker can verify the entitlement server-side.
  useEffect(() => {
    if (Platform.OS !== "android" || REVENUECAT_ANDROID_KEY.includes("HERE")) return;
    (async () => {
      try {
        const appUserID = await getDeviceId();
        Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID });
      } catch (e: any) {
        console.log("[Purchases] configure error:", e?.message || e);
      }
    })();
  }, []);

  if (session === null) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b1020" }}><ActivityIndicator color="#5b8cff" /></View>;
  }

  if (!langLoaded) {
    return <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }} />;
  }
  if (!langChosen) {
    return (
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        <StatusBar style="light" />
        <LanguageChooser onSelect={setLanguage} />
      </PaperProvider>
    );
  }
  if (aiConsent !== true) {
    if (aiConsent === null) {
      return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDark ? "#000" : "#fff" }}><ActivityIndicator color="#5b8cff" /></View>;
    }
    return (
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        <StatusBar style="light" />
        <AIConsentScreen onAgree={agreeAiConsent} />
      </PaperProvider>
    );
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
        <Stack.Screen name="Subscription">
          {(props) => (
            <SubscriptionScreen onBack={() => props.navigation.goBack()} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
    </PaperProvider>
  );
}
