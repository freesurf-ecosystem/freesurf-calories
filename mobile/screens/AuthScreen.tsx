import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

type Props = { onAuthenticated: () => void; onBack: () => void };

export default function AuthScreen({ onAuthenticated, onBack }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    if (mode === "signup" && password !== confirm) { setMessage("Passwords don't match"); return; }
    if (mode === "signup" && password.length < 6) { setMessage("Password must be 6+ characters"); return; }

    setLoading(true); setMessage("");
    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });

    if (error) { setMessage(error.message); setLoading(false); return; }
    onAuthenticated();
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.brand}>FreeSurf</Text>
          <Pressable onPress={onBack} hitSlop={12} style={styles.closeBtn}><Text style={styles.closeBtnText}>✕</Text></Pressable>
        </View>
        <Text style={styles.heading}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, mode === "signin" && styles.tabActive]} onPress={() => { setMode("signin"); setMessage(""); }}><Text style={[styles.tabLabel, mode === "signin" && styles.tabActiveLabel]}>Sign in</Text></Pressable>
          <Pressable style={[styles.tab, mode === "signup" && styles.tabActive]} onPress={() => { setMode("signup"); setMessage(""); }}><Text style={[styles.tabLabel, mode === "signup" && styles.tabActiveLabel]}>Create account</Text></Pressable>
        </View>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#5f6b7a" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#5f6b7a" secureTextEntry value={password} onChangeText={setPassword} />
        {mode === "signup" && <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor="#5f6b7a" secureTextEntry value={confirm} onChangeText={setConfirm} />}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable style={[styles.button, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  inner: { padding: 28, paddingTop: 72, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#5b8cff", marginBottom: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, color: "#5f6b7a", lineHeight: 16 },
  heading: { fontSize: 28, fontWeight: "700", color: "#e8ecff", marginBottom: 8 },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: "#2a3568", borderRadius: 999, padding: 4 },
  tab: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#1e2a4a" },
  tabLabel: { fontSize: 14, fontWeight: "500", color: "#5f6b7a" },
  tabActiveLabel: { color: "#5b8cff", fontWeight: "700" },
  input: { backgroundColor: "#111937", borderWidth: 1, borderColor: "#2a3568", borderRadius: 12, padding: 14, fontSize: 15, color: "#e8ecff" },
  message: { color: "#f87171", fontSize: 13 },
  button: { backgroundColor: "#5b8cff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
