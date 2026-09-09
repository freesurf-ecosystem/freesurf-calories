import React from "react";
import { View, ScrollView, Linking } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { onAgree: () => void };

const PRIVACY_URL = "https://freesurf.tools/privacy";

export default function AIConsentScreen({ onAgree }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: 24 }}
      >
        <Text variant="headlineSmall" style={{ fontWeight: "800", marginBottom: 8 }}>
          How your food photos are processed
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 20 }}>
          Calorie Tracker estimates your food's nutrition using AI. To do that, we need your permission to send your photos to a third-party service for processing.
        </Text>

        <View style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 14, padding: 16, gap: 12, marginBottom: 20 }}>
          <View>
            <Text variant="titleSmall" style={{ fontWeight: "700", marginBottom: 2 }}>What is sent</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 19 }}>
              The food photos you take are transmitted to our servers to estimate their nutrition.
            </Text>
          </View>
          <View>
            <Text variant="titleSmall" style={{ fontWeight: "700", marginBottom: 2 }}>Who it is sent to</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 19 }}>
              Photos are processed by FreeSurf's AI service provider, Together AI (Together Computer, Inc.), routed through our own servers.
            </Text>
          </View>
          <View>
            <Text variant="titleSmall" style={{ fontWeight: "700", marginBottom: 2 }}>Your privacy</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 19 }}>
              Your photos are used only to complete the nutrition estimate you request. They are not stored by us or used to train AI models.
            </Text>
          </View>
        </View>

        <Button mode="contained" onPress={onAgree} contentStyle={{ height: 54 }} labelStyle={{ fontSize: 17, fontWeight: "700" }} style={{ marginBottom: 10 }}>
          I Agree & Continue
        </Button>
        <Button mode="text" onPress={() => Linking.openURL(PRIVACY_URL)} labelStyle={{ fontSize: 15 }}>
          Privacy Policy
        </Button>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 12, lineHeight: 18 }}>
          We never process your photos without your consent. You can stop using this feature at any time.
        </Text>
      </ScrollView>
    </View>
  );
}
