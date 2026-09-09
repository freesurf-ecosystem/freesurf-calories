import React, { useState } from "react";
import { View, ScrollView, Pressable, Linking } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { onAgree: () => void };

const TERMS_URL = "https://freesurf.tools/terms";
const PRIVACY_URL = "https://freesurf.tools/privacy";
const AI_URL = "https://freesurf.tools/privacy"; // dedicated AI & data processing doc link

const AI_COPY =
  "Calorie Tracker uses AI to estimate nutrition. When you photograph a meal, we send the photo to the Together AI serverless network, where open-source models analyze it and return calorie and macro estimates to you.";

export default function AIConsentScreen({ onAgree }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [checks, setChecks] = useState({ terms: false, privacy: false, ai: false });

  const all = checks.terms && checks.privacy && checks.ai;

  const toggle = (k: keyof typeof checks) => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const items = [
    { key: "terms" as const, label: "I agree to the Terms of Service", url: TERMS_URL },
    { key: "privacy" as const, label: "I have read the Privacy Policy", url: PRIVACY_URL },
    { key: "ai" as const, label: "I consent to AI data processing (below)", url: AI_URL },
  ];

  const checkbox = (on: boolean) => (
    <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: on ? theme.colors.primary : "transparent" }}>
      {on && <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 15 }}>✓</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: 24 }}>
        <Text variant="headlineSmall" style={{ fontWeight: "800", marginBottom: 6 }}>Welcome to Calorie Tracker</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 20 }}>
          Before you begin, please review and accept the following. You can change your mind and stop using these features at any time.
        </Text>

        <View style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <Text variant="titleSmall" style={{ fontWeight: "700", marginBottom: 6 }}>How we use AI</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>{AI_COPY}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20, marginTop: 10 }}>
            Your content is used only to complete the request you make. It is not stored by us or used to train AI models.
          </Text>
        </View>

        <View style={{ gap: 14, marginBottom: 24 }}>
          {items.map((it) => (
            <Pressable key={it.key} onPress={() => toggle(it.key)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {checkbox(checks[it.key])}
              <Text style={{ flex: 1, fontSize: 15, color: theme.colors.onSurface }}>
                {it.label}
                {"  "}
                <Text style={{ color: theme.colors.primary, textDecorationLine: "underline" }} onPress={() => Linking.openURL(it.url)}>
                  Read
                </Text>
              </Text>
            </Pressable>
          ))}
        </View>

        <Button mode="contained" disabled={!all} onPress={onAgree} contentStyle={{ height: 54 }} labelStyle={{ fontSize: 17, fontWeight: "700" }}>
          I Agree & Continue
        </Button>
      </ScrollView>
    </View>
  );
}
