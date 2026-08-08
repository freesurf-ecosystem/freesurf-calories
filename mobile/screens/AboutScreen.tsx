import React from "react";
import { View, ScrollView, Linking } from "react-native";
import { Text, Button, Surface, useTheme, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOOLS = [
  { name: "Natural Reader", desc: "Text-to-speech with 40+ voices" },
  { name: "Transcriber", desc: "Speech-to-text with speaker diarization" },
  { name: "Calorie Tracker", desc: "AI-powered food logging" },
  { name: "Invoices", desc: "Free invoice generator" },
  { name: "Links", desc: "Link-in-bio pages" },
  { name: "Post", desc: "Cross-posting tool" },
];

type Props = { onBack: () => void };

export default function AboutScreen({ onBack }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Surface style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingTop: insets.top + 4, paddingBottom: 4, elevation: 0, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
        <IconButton icon="arrow-left" size={22} onPress={onBack} />
        <Text variant="titleMedium" style={{ fontWeight: "700" }}>About FreeSurf</Text>
      </Surface>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text variant="headlineSmall" style={{ fontWeight: "800", marginBottom: 8 }}>
          Free, open-source tools for everyone.
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22, marginBottom: 24 }}>
          FreeSurf is an open-source platform connecting people directly with contractors — and a growing collection of free tools for everyday tasks. Ad-supported and built in the open.
        </Text>

        <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 12 }}>Our Tools</Text>
        {TOOLS.map((tool) => (
          <View key={tool.name} style={{ marginBottom: 14 }}>
            <Text variant="bodyLarge" style={{ fontWeight: "600" }}>{tool.name}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{tool.desc}</Text>
          </View>
        ))}

        <View style={{ marginTop: 24, gap: 12 }}>
          <Button mode="outlined" onPress={() => Linking.openURL("https://freesurf.tools")}>
            Visit freesurf.tools
          </Button>
          <Button mode="outlined" onPress={() => Linking.openURL("https://github.com/freesurf-ecosystem")}>
            View on GitHub
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
