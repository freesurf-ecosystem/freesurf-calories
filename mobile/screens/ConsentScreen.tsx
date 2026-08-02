import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

const CONSENT_KEY = "freesurf-calorietracker-consent-v1";

type Props = NativeStackScreenProps<RootStackParamList, "Consent">;

export default function ConsentScreen({ navigation }: Props) {
  async function handleAgree() {
    await AsyncStorage.setItem(CONSENT_KEY, "true");
    navigation.replace("CalorieTracker");
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>📸</Text>
        <Text style={styles.title}>Calorie Tracker</Text>
        <Text style={styles.subtitle}>by FreeSurf</Text>

        <View style={styles.divider} />

        <Text style={styles.body}>
          This app uses AI to identify food in photos and estimate nutritional
          information. The AI runs on our own servers — your photos are never
          sent to third-party AI companies. Photos are analyzed in real-time and
          immediately deleted.
        </Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Photos are <Text style={styles.bold}>processed and deleted immediately</Text></Text>
          <Text style={styles.bullet}>• Meal logs are <Text style={styles.bold}>saved on your device only</Text></Text>
          <Text style={styles.bullet}>• Calorie estimates are <Text style={styles.bold}>AI-assisted, not medical advice</Text></Text>
          <Text style={styles.bullet}>• <Text style={styles.bold}>No account required</Text> — ever</Text>
        </View>

        <TouchableOpacity style={styles.agreeBtn} onPress={handleAgree}>
          <Text style={styles.agreeText}>Agree & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.privacyLink}
          onPress={() => Linking.openURL("https://freesurf.tools/privacy")}
        >
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#111937", borderRadius: 20, padding: 28, borderWidth: 1, borderColor: "#2a3568", alignItems: "center" },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "700", color: "#e8ecff" },
  subtitle: { fontSize: 14, color: "#5b8cff", marginTop: 2, marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#2a3568", alignSelf: "stretch", marginVertical: 20 },
  body: { fontSize: 14, color: "#b3bddf", lineHeight: 21, textAlign: "center", marginBottom: 20 },
  bullets: { alignSelf: "stretch", gap: 10, marginBottom: 28 },
  bullet: { fontSize: 13, color: "#b3bddf", lineHeight: 19 },
  bold: { fontWeight: "700", color: "#e8ecff" },
  agreeBtn: { backgroundColor: "#5b8cff", borderRadius: 12, padding: 16, alignSelf: "stretch", alignItems: "center", marginBottom: 12 },
  agreeText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  privacyLink: { padding: 8 },
  privacyText: { color: "#5f6b7a", fontSize: 13, textDecorationLine: "underline" },
});
