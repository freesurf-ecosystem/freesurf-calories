import React, { useState } from "react";
import { View, ScrollView, Pressable, Linking } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { onAgree: () => void };

const TERMS_URL = "https://freesurf.tools/terms";
const PRIVACY_URL = "https://freesurf.tools/privacy";
const AI_URL = "https://freesurf.tools/privacy#ai-processing";

const AI_COPY =
  "Calorie Tracker uses AI to estimate nutrition. When you photograph a meal, we send the photo to the Together AI serverless network, where open-source models analyze it and return calorie and macro estimates to you.";

export default function AIConsentScreen({ onAgree }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);

  const linkStyle = { color: theme.colors.primary, textDecorationLine: "underline" as const };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: 24 }}>
        <Text variant="headlineSmall" style={{ fontWeight: "800", marginBottom: 10 }}>Welcome to Calorie Tracker</Text>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 12 }}>
          Please review and accept the following to continue.
        </Text>

        <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 8 }}>How we use AI</Text>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 24 }}>
          {AI_COPY} Your content is used only to complete the request you make. It is not stored by us or used to train AI models.
        </Text>

        <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24, paddingVertical: 4 }}>
          <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: agreed ? theme.colors.primary : "transparent" }}>
            {agreed && <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 16 }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 15, color: theme.colors.onSurface, lineHeight: 21 }}>
            I agree to the{" "}
            <Text style={linkStyle} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
            {", the "}
            <Text style={linkStyle} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
            {", and "}
            <Text style={linkStyle} onPress={() => Linking.openURL(AI_URL)}>how AI is used</Text>
            {" to process my data."}
          </Text>
        </Pressable>

        <Button mode="contained" disabled={!agreed} onPress={onAgree} contentStyle={{ height: 54 }} labelStyle={{ fontSize: 17, fontWeight: "700" }}>
          I Agree & Continue
        </Button>
      </ScrollView>
    </View>
  );
}
