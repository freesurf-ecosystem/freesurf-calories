import React, { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

type Props = { onAuthenticated: () => void };

const TERMS_URL = "https://Free Surf.tools/terms";
const PRIVACY_URL = "https://Free Surf.tools/privacy";
const AI_URL = "https://Free Surf.tools/ai-processing";
const DIGEST_URL = "https://feedfree.tech";

export default function Onboarding({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [digest, setDigest] = useState(false);
  const [loading, setLoading] = useState<false | "email" | "google" | "apple">(false);
  const [message, setMessage] = useState("");

  function reset() { setMessage(""); }

  async function emailSubmit() {
    if (!email.trim() || !password) return;
    if (!agree) { setMessage("Please agree to the Terms and Privacy Policy."); return; }
    if (mode === "signup" && password !== confirm) { setMessage("Passwords don't match"); return; }
    if (mode === "signup" && password.length < 6) { setMessage("Password must be 6+ characters"); return; }

    setLoading("email"); setMessage("");
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setMessage(error.message); setLoading(false); return; }
      onAuthenticated();
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) { setMessage(error.message); setLoading(false); return; }
      const note = digest ? await subscribeDigest(email.trim()) : "";
      if (data.session) { onAuthenticated(); }
      else { setMessage("Account created. Check your email to confirm, then sign in." + note); setMode("signin"); }
    }
    setLoading(false);
  }

  async function subscribeDigest(address: string) {
    try {
      const { error } = await supabase.functions.invoke("feedfree-create-signup", { body: { email: address, topics: [] } });
      return error ? " Note: couldn't subscribe you to the FeedFree Digest — join at feedfree.tech." : "";
    } catch {
      return " Note: couldn't subscribe you to the FeedFree Digest — join at feedfree.tech.";
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!agree) { setMessage("Please agree to the Terms and Privacy Policy."); return; }
    setLoading(provider); setMessage("");
    try {
      const redirectTo = AuthSession.makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          ...(provider === "google" ? { scopes: "openid email" } : {}),
        },
      });
      if (error) { setMessage(error.message); setLoading(false); return; }
      if (!data?.url) { setLoading(false); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success") {
        const url = result.url;
        const hash = url.includes("#") ? url.split("#")[1] ?? "" : "";
        const hashParams = new URLSearchParams(hash);
        const code = hashParams.get("code") ?? new URL(url).searchParams.get("code");
        const accessToken = hashParams.get("access_token");
        try {
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get("refresh_token") ?? "",
            });
          } else if (code) {
            const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
            if (ex) setMessage(ex.message);
          } else {
            setMessage("Sign-in did not return a session. Please try again.");
          }
        } catch (e: any) {
          setMessage(e?.message || "Sign-in failed.");
        }
        if (digest) {
          try {
            const { data: sessData } = await supabase.auth.getSession();
            const addr = sessData.session?.user?.email;
            if (addr) await subscribeDigest(addr);
          } catch { /* non-critical */ }
        }
      } else if (result.type === "dismiss") {
        setMessage("Sign-in was canceled.");
      }
    } catch (e: any) {
      setMessage(e?.message || "Sign-in failed.");
    }
    setLoading(false);
  }

  const brand = "#5b8cff", bg = "#000000", surface = "#0d0d0d", border = "#1a1a1a",
        text = "#e8ecff", muted = "#5f6b7a", link = "#5b8cff";

  const LinkText = ({ url, label }: { url: string; label: string }) => (
    <Text style={{ color: link, textDecorationLine: "underline" }} onPress={() => Linking.openURL(url)}>{label}</Text>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 90, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: brand, marginBottom: 4 }}>Free Surf</Text>
        <Text style={{ fontSize: 30, fontWeight: "700", color: text, marginBottom: 2 }}>Create account</Text>
        <Text style={{ color: muted, marginBottom: 8 }}>Create a free account to get started.</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["google", "apple"] as const).map((p) => (
            <Pressable key={p} onPress={() => oauth(p)} disabled={!!loading} style={[btn, { flex: 1 }]}>
              {loading === p ? <ActivityIndicator color="#fff" /> : <Text style={btnText}>Continue with {p === "google" ? "Google" : "Apple"}</Text>}
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: border }} />
          <Text style={{ color: muted }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: border }} />
        </View>

        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: border, borderRadius: 999, padding: 4 }}>
          <Pressable style={[tab, mode === "signup" && { backgroundColor: "#1e2a4a" }]} onPress={() => { setMode("signup"); reset(); }}>
            <Text style={{ fontSize: 14, fontWeight: mode === "signup" ? "700" : "500", color: mode === "signup" ? brand : muted, textAlign: "center" }}>Create account</Text>
          </Pressable>
          <Pressable style={[tab, mode === "signin" && { backgroundColor: "#1e2a4a" }]} onPress={() => { setMode("signin"); reset(); }}>
            <Text style={{ fontSize: 14, fontWeight: mode === "signin" ? "700" : "500", color: mode === "signin" ? brand : muted, textAlign: "center" }}>Sign in</Text>
          </Pressable>
        </View>

        <TextInput style={[input, { color: text, borderColor: border, backgroundColor: surface }]} placeholder="Email" placeholderTextColor={muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={[input, { color: text, borderColor: border, backgroundColor: surface }]} placeholder="Password" placeholderTextColor={muted} secureTextEntry value={password} onChangeText={setPassword} />
        {mode === "signup" && <TextInput style={[input, { color: text, borderColor: border, backgroundColor: surface }]} placeholder="Confirm password" placeholderTextColor={muted} secureTextEntry value={confirm} onChangeText={setConfirm} />}

        {/* Terms consent (required) */}
        <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 6 }}>
          <Text style={{ color: brand, fontWeight: "700", fontSize: 18, lineHeight: 20 }}>{agree ? "☑" : "☐"}</Text>
          <Text style={{ color: text, fontSize: 14, flex: 1 }} onPress={() => setAgree(!agree)}>
            I agree to the <LinkText url={TERMS_URL} label="Terms" />, <LinkText url={PRIVACY_URL} label="Privacy Policy" />, and <LinkText url={AI_URL} label="AI Processing" />
          </Text>
        </Pressable>

        {/* Feedfree Digest (optional) */}
        <Pressable onPress={() => setDigest(!digest)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 4 }}>
          <Text style={{ color: muted, fontWeight: "700", fontSize: 18, lineHeight: 20 }}>{digest ? "☑" : "☐"}</Text>
          <Text style={{ color: text, fontSize: 14, flex: 1 }}>
            Subscribe to the <LinkText url={DIGEST_URL} label="FeedFree Digest" /> — Curated blog-length social posts covering AI, SEO, social media marketing and more - from X and LinkedIn
          </Text>
        </Pressable>

        {message ? <Text style={{ color: "#f87171", fontSize: 13 }}>{message}</Text> : null}

        <Pressable style={[btn, { marginTop: 8, opacity: loading && loading !== "email" ? 0.5 : 1 }]} onPress={emailSubmit} disabled={!!loading}>
          {loading === "email" ? <ActivityIndicator color="#fff" /> : <Text style={btnText}>{mode === "signup" ? "Create account" : "Sign in"}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const btn = { backgroundColor: "#1e2a4a", borderRadius: 12, paddingVertical: 15, paddingHorizontal: 12, alignItems: "center" as const };
const btnText = { color: "#ffffff", fontSize: 15, fontWeight: "700" as const };
const tab = { flex: 1, borderRadius: 999, paddingVertical: 10 };
const input = { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 };
