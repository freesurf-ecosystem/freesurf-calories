import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { deviceLang, translations } from "../i18n";

type Props = { onSelect: (code: string) => void; onBack?: () => void };

const NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ms: "Bahasa Melayu",
  tl: "Filipino",
  nl: "Nederlands",
  pl: "Polski",
  sv: "Svenska",
  no: "Norsk",
  da: "Dansk",
  fi: "Suomi",
  cs: "Čeština",
  el: "Ελληνικά",
  ro: "Română",
  hu: "Magyar",
  uk: "Українська",
  ar: "العربية",
  bn: "বাংলা",
  ur: "اردو",
  mr: "मराठी",
  te: "తెలుగు",
  ta: "தமிழ்",
  fa: "فارسی",
  ha: "Hausa",
};

/** English name for each language, shown to the right of the native name. */
const ENGLISH: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  tr: "Turkish",
  hi: "Hindi",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ms: "Malay",
  tl: "Filipino",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  cs: "Czech",
  el: "Greek",
  ro: "Romanian",
  hu: "Hungarian",
  uk: "Ukrainian",
  ar: "Arabic",
  bn: "Bengali",
  ur: "Urdu",
  mr: "Marathi",
  te: "Telugu",
  ta: "Tamil",
  fa: "Persian",
  ha: "Hausa",
};

/** Shown on first launch: pick your app language. Only lists languages we actually translate. */
export default function LanguageChooser({ onSelect, onBack }: Props) {
  const detected = deviceLang();
  const offered = Object.keys(translations).sort((a, b) => (NAMES[a] || a).localeCompare(NAMES[b] || b));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <Pressable style={styles.back} onPress={onBack}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Choose your language</Text>
        {translations[detected] && (
          <Pressable style={styles.detected} onPress={() => onSelect(detected)}>
            <Text style={styles.detectedText}>Use {NAMES[detected] || detected}</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={offered}
        keyExtractor={(code) => code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelect(item)}>
            <Text style={styles.rowText}>{NAMES[item] || item}</Text>
            <Text style={styles.rowEnglish}>{ENGLISH[item] || item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 16, gap: 10 },
  back: { paddingVertical: 4, alignSelf: "flex-start" },
  backText: { color: "#5b8cff", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: "#e8ecff" },
  detected: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#3b6cff", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  detectedText: { color: "#5b8cff", fontWeight: "700" },
  list: { paddingBottom: 40 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  rowText: { color: "#e8ecff", fontSize: 16, flexShrink: 1 },
  rowEnglish: { color: "#5f6b7a", fontSize: 14, marginLeft: 12 },
});
