import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { supabase } from "./lib/supabase";
import CalorieTrackerScreen from "./screens/CalorieTrackerScreen";
import AuthScreen from "./screens/AuthScreen";

export type RootStackParamList = {
  CalorieTracker: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(Boolean(s)));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    requestTrackingPermissionsAsync().catch(() => {});
  }, []);

  if (session === null) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b1020" }}><ActivityIndicator color="#5b8cff" /></View>;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0b1020" } }}>
        <Stack.Screen name="CalorieTracker">
          {(props) => (
            <CalorieTrackerScreen isLoggedIn={session} onSignIn={() => props.navigation.navigate("Auth")} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {(props) => (
            <AuthScreen onAuthenticated={() => { setSession(true); props.navigation.goBack(); }} onBack={() => props.navigation.goBack()} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}