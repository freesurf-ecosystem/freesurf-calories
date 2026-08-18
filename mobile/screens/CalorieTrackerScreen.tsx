import React, { useState, useEffect } from "react";
import { View, ScrollView, Image, ActivityIndicator, Alert, Modal, Switch, Linking, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Camera, Pencil, Plus, Trash2, Utensils } from "lucide-react-native";
import {
  Text, Card, Button, IconButton, ProgressBar,
  TextInput, Surface, useTheme, FAB,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import FloatingHamburger from "../components/FloatingHamburger";
import { WORKER_URL } from "../lib/config";

const LOG_KEY = "freesurf-calorie-log";
const GOAL_KEY = "freesurf-calorie-goal";

interface FoodItem { id: string; name: string; qty: string; unit?: string; calories: number; protein: number; carbs: number; fat: number; }

const UNITS = ["", "cup", "oz", "g", "tbsp", "tsp", "slice", "piece", "bowl", "ml", "lb", "whole"];
interface MealEntry { id: string; items: FoodItem[]; imageUri?: string; ts: number; }

type Props = { isLoggedIn: boolean; onSignIn: () => void; isDark?: boolean; onToggleTheme?: () => void; navigation?: any; };

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function isSameDay(a: Date, b: Date) { return fmtDate(a) === fmtDate(b); }
function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() - n); return r; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export default function CalorieTrackerScreen({ isLoggedIn, onSignIn, isDark, onToggleTheme, navigation }: Props) {
  const theme = useTheme();
  const [log, setLog] = useState<MealEntry[]>([]);
  const [goal, setGoal] = useState(2000);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fabOpen, setFabOpen] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalInput, setGoalInput] = useState("2000");
  const [manualItem, setManualItem] = useState({ name: "", qty: "1", unit: "", calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    try {
      const [lr, gr] = await Promise.all([AsyncStorage.getItem(LOG_KEY), AsyncStorage.getItem(GOAL_KEY)]);
      if (lr) setLog(JSON.parse(lr));
      if (gr) { const g = Number(gr); setGoal(g); setGoalInput(String(g)); }
    } catch {}
  }
  async function saveLog(u: MealEntry[]) { setLog(u); await AsyncStorage.setItem(LOG_KEY, JSON.stringify(u)); }
  async function saveGoal(g: number) { setGoal(g); await AsyncStorage.setItem(GOAL_KEY, String(g)); }

  const todayMeals = log.filter((e) => isSameDay(new Date(e.ts), selectedDate));
  const tc = Math.round(todayMeals.reduce((s, e) => s + e.items.reduce((a, i) => a + i.calories * (Number(i.qty) || 1), 0), 0));
  const tp = Math.round(todayMeals.reduce((s, e) => s + e.items.reduce((a, i) => a + i.protein * (Number(i.qty) || 1), 0), 0) * 10) / 10;
  const tcb = Math.round(todayMeals.reduce((s, e) => s + e.items.reduce((a, i) => a + i.carbs * (Number(i.qty) || 1), 0), 0) * 10) / 10;
  const tf = Math.round(todayMeals.reduce((s, e) => s + e.items.reduce((a, i) => a + i.fat * (Number(i.qty) || 1), 0), 0) * 10) / 10;
  const rem = Math.max(0, goal - tc);
  const isToday = isSameDay(selectedDate, new Date());

  const wd = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const c = Math.round(log.filter((e) => isSameDay(new Date(e.ts), d)).reduce((s, e) => s + e.items.reduce((a, i) => a + i.calories * (Number(i.qty) || 1), 0), 0));
    return { l: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), c, selected: isSameDay(d, selectedDate) };
  });

  async function openCam() {
    console.log("[Camera] openCam called");
    try {
      console.log("[Camera] checking permissions...");
      const perm = await ImagePicker.getCameraPermissionsAsync();
      console.log("[Camera] permission status:", JSON.stringify(perm));
      if (!perm.granted) {
        console.log("[Camera] permission not granted, requesting...");
        const req = await ImagePicker.requestCameraPermissionsAsync();
        console.log("[Camera] request result:", JSON.stringify(req));
        if (!req.granted) {
          console.log("[Camera] permission denied");
          Alert.alert("Camera access needed", "Please enable camera access in Settings to take food photos.");
          return;
        }
      }
      console.log("[Camera] launching camera...");
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      console.log("[Camera] launch result canceled:", r.canceled, "assets:", r.assets?.length ?? 0);
      if (!r.canceled && r.assets[0]) {
        console.log("[Camera] photo captured, uri:", r.assets[0].uri);
        analyze(r.assets[0].uri);
      } else {
        console.log("[Camera] user cancelled or no assets");
      }
    } catch (e: any) {
      console.log("[Camera] error:", e?.message || e, "stack:", e?.stack);
      Alert.alert("Camera Error", e?.message || "Unable to open camera");
    }
  }
  async function analyze(uri: string) {
    console.log("[Analyze] called with uri:", uri);
    setIsAnalyzing(true);
    try {
      console.log("[Analyze] reading file as base64...");
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      console.log("[Analyze] base64 length:", b64?.length ?? 0);
      const body = JSON.stringify({ image_base64: b64 });
      console.log("[Analyze] sending to:", `${WORKER_URL}/api/analyze`, "body size:", body.length);
      const res = await fetch(`${WORKER_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      console.log("[Analyze] response status:", res.status);
      const text = await res.text();
      console.log("[Analyze] response text (first 500):", text.slice(0, 500));
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response from server"); }
      if (data.error) throw new Error(data.error);
      const items: FoodItem[] = (data.items || []).map((it: any, i: number) => {
        const amount = Number(it.amount) || 1;
        return {
          id: `ai-${Date.now()}-${i}`, name: it.name || "Unknown", qty: String(it.amount ?? it.qty ?? ""), unit: it.unit || "",
          calories: Math.round((it.calories || 0) / amount), protein: Math.round(((it.protein || 0) / amount) * 10) / 10, carbs: Math.round(((it.carbs || 0) / amount) * 10) / 10, fat: Math.round(((it.fat || 0) / amount) * 10) / 10,
        };
      });
      console.log("[Analyze] parsed items count:", items.length);
      setEditEntry({ id: Date.now().toString(), items, imageUri: uri, ts: selectedDate.getTime() });
    } catch (e: any) {
      console.log("[Analyze] error:", e?.message || e, "stack:", e?.stack);
      Alert.alert("Error", e.message || "Analysis failed.");
    }
    finally { setIsAnalyzing(false); }
  }
  async function pickLib() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled && r.assets[0]) analyze(r.assets[0].uri);
  }
  function saveEdit() {
    if (!editEntry || editEntry.items.length === 0) return;
    const idx = log.findIndex((e) => e.id === editEntry.id);
    const updated = idx >= 0 ? log.map((e) => (e.id === editEntry.id ? editEntry : e)) : [editEntry, ...log];
    saveLog(updated);
    setEditEntry(null);
  }
  function updItem(id: string, f: keyof FoodItem, v: string, srcItem?: FoodItem) {
    if (!editEntry) return;
    const isString = f === "name" || f === "qty" || f === "unit";
    const isMacro = f === "calories" || f === "protein" || f === "carbs" || f === "fat";
    setEditEntry({
      ...editEntry,
      items: editEntry.items.map((it) => {
        if (it.id !== id) return it;
        const qty = Number(it.qty) || 1;
        let val: any = isString ? v : Number(v) || 0;
        if (isMacro && srcItem) {
          val = Math.round(((Number(v) || 0) / qty) * (f === "calories" ? 1 : 10)) / (f === "calories" ? 1 : 10);
        }
        const updated = { ...it, [f]: val };
        if (f === "protein" || f === "carbs" || f === "fat") {
          updated.calories = Math.round((updated.protein * 4) + (updated.carbs * 4) + (updated.fat * 9));
        }
        return updated;
      })
    });
  }
  function rmItem(id: string) { if (!editEntry) return; setEditEntry({ ...editEntry, items: editEntry.items.filter((i) => i.id !== id) }); }
  async function reEstimateItem(item: FoodItem) {
    const desc = [item.qty, item.unit, item.name].filter(Boolean).join(" ");
    if (!desc.trim()) return;
    try {
      const res = await fetch(`${WORKER_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ food_description: desc }) });
      const data = await res.json();
      if (data.error || !data.items?.[0]) { Alert.alert("Error", "Could not estimate nutrition."); return; }
      const est = data.items[0];
      updItem(item.id, "name", est.name || item.name);
      updItem(item.id, "calories", String(est.calories || 0), item);
      updItem(item.id, "protein", String(est.protein || 0), item);
      updItem(item.id, "carbs", String(est.carbs || 0), item);
      updItem(item.id, "fat", String(est.fat || 0), item);
    } catch (e: any) { Alert.alert("Error", e.message || "Estimation failed."); }
  }
  function addItem() { if (!editEntry) return; setEditEntry({ ...editEntry, items: [...editEntry.items, { id: `m-${Date.now()}`, name: "", qty: "", calories: 0, protein: 0, carbs: 0, fat: 0 }] }); }
  async function estimateFood() {
    const desc = [manualItem.qty, manualItem.unit, manualItem.name].filter(Boolean).join(" ");
    if (!desc.trim()) return;
    setIsEstimating(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ food_description: desc }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const item = (data.items || [])[0];
      if (item) {
        const amount = Number(manualItem.qty) || 1;
        setManualItem(prev => ({
          ...prev,
          name: item.name || prev.name,
          calories: String(Math.round((item.calories || 0) / amount)),
          protein: String(Math.round(((item.protein || 0) / amount) * 10) / 10),
          carbs: String(Math.round(((item.carbs || 0) / amount) * 10) / 10),
          fat: String(Math.round(((item.fat || 0) / amount) * 10) / 10),
        }));
      } else {
        Alert.alert("Not found", "Could not estimate nutrition for this food.");
      }
    } catch (e: any) { Alert.alert("Error", e.message || "Estimation failed."); }
    finally { setIsEstimating(false); }
  }
  function addManual() {
    const cal = Number(manualItem.calories) || 0;
    const p = Number(manualItem.protein) || 0;
    const cb = Number(manualItem.carbs) || 0;
    const f = Number(manualItem.fat) || 0;
    const estimatedCal = cal > 0 ? cal : (p * 4 + cb * 4 + f * 9);
    if (!manualItem.name.trim() || estimatedCal === 0) { Alert.alert("Missing info", "Calories are empty — please enter manually or tap 'Look up calories' above."); return; }
    saveLog([{ id: Date.now().toString(), items: [{ id: `man-${Date.now()}`, name: manualItem.name.trim() || "Quick add", qty: manualItem.qty || "", unit: manualItem.unit || "", calories: estimatedCal, protein: p, carbs: cb, fat: f }], ts: selectedDate.getTime() }, ...log]);
    setShowAddManual(false); setManualItem({ name: "", qty: "1", unit: "cup", calories: "", protein: "", carbs: "", fat: "" });
  }
  function del(id: string) { saveLog(log.filter((e) => e.id !== id)); }

  const themeToggleFooter = onToggleTheme ? (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      <Switch value={!isDark} onValueChange={onToggleTheme} trackColor={{ true: isDark ? "#ffffff" : "#111827", false: "#555" }} />
    </View>
  ) : undefined;

  const hbColors = {
    text: theme.colors.onSurface,
    dim: theme.colors.onSurfaceVariant,
    card: theme.colors.surface,
    border: theme.colors.outline,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Goal dialog */}
      <Modal visible={showGoalDialog} transparent animationType="fade" onRequestClose={() => setShowGoalDialog(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <Surface style={{ borderRadius: 16, padding: 24 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 16 }}>Daily calorie goal</Text>
            <TextInput mode="outlined" label="Calories" value={goalInput} onChangeText={setGoalInput} keyboardType="numeric" />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <Button onPress={() => setShowGoalDialog(false)}>Cancel</Button>
              <Button mode="contained" onPress={() => { const g = Number(goalInput) || 2000; saveGoal(g); setShowGoalDialog(false); }}>Save</Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Meal confirm modal */}
      <Modal visible={!!editEntry} animationType="slide">
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, paddingTop: 54, backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
            <Button textColor={theme.colors.error} onPress={() => setEditEntry(null)}>Cancel</Button>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>Confirm Meal</Text>
            <Button onPress={saveEdit}>Save</Button>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {editEntry?.imageUri && <Image source={{ uri: editEntry.imageUri }} style={{ width: "100%", height: 200, borderRadius: 14, marginBottom: 16 }} resizeMode="cover" />}
            {editEntry?.items.map((item) => (
              <Card key={item.id} style={{ marginBottom: 10 }} mode="contained">
                <Card.Content style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput mode="outlined" style={{ flex: 1 }} value={item.name} onChangeText={(v) => updItem(item.id, "name", v)} placeholder="Food name" dense />
                    <TextInput mode="outlined" style={{ width: 50, fontSize: 13 }} value={item.qty} onChangeText={(v) => updItem(item.id, "qty", v)} placeholder="1" dense keyboardType="numeric" />
                  <UnitPicker item={item} onChange={(v) => updItem(item.id, "unit", v)} theme={theme} />
                    <IconButton icon="refresh" size={16} onPress={() => reEstimateItem(item)} />
                    <IconButton icon="close" size={18} iconColor={theme.colors.error} onPress={() => rmItem(item.id)} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <MI l="Cal" v={Math.round(item.calories * (Number(item.qty) || 1))} onChange={(v) => updItem(item.id, "calories", v, item)} theme={theme} />
                    <MI l="Prot" v={Math.round((item.protein * (Number(item.qty) || 1)) * 10) / 10} onChange={(v) => updItem(item.id, "protein", v, item)} theme={theme} />
                    <MI l="Carbs" v={Math.round((item.carbs * (Number(item.qty) || 1)) * 10) / 10} onChange={(v) => updItem(item.id, "carbs", v, item)} theme={theme} />
                    <MI l="Fat" v={Math.round((item.fat * (Number(item.qty) || 1)) * 10) / 10} onChange={(v) => updItem(item.id, "fat", v, item)} theme={theme} />
                  </View>
                </Card.Content>
              </Card>
            ))}
            <Button mode="outlined" onPress={addItem}>+ Add food item</Button>
          </ScrollView>
        </View>
      </Modal>

      {/* Quick add modal */}
      <Modal visible={showAddManual} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" }}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Quick Add</Text>
            <TextInput mode="outlined" label="Food name" value={manualItem.name} onChangeText={(v) => setManualItem({ ...manualItem, name: v })} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TextInput mode="outlined" label="Amount" value={manualItem.qty} onChangeText={(v) => setManualItem({ ...manualItem, qty: v })} keyboardType="numeric" dense style={{ width: 80, fontSize: 13 }} />
              <UnitPicker item={{ unit: manualItem.unit }} onChange={(v) => setManualItem({ ...manualItem, unit: v })} theme={theme} />
            </View>
            <Button mode="outlined" loading={isEstimating} onPress={estimateFood} style={{ marginBottom: 16 }} icon="magnify">Look up calories</Button>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <MI l="Cal" v={Number(manualItem.calories) || 0} onChange={(v) => setManualItem({ ...manualItem, calories: v })} theme={theme} />
              <MI l="Prot" v={Number(manualItem.protein) || 0} onChange={(v) => setManualItem({ ...manualItem, protein: v })} theme={theme} />
              <MI l="Carbs" v={Number(manualItem.carbs) || 0} onChange={(v) => setManualItem({ ...manualItem, carbs: v })} theme={theme} />
              <MI l="Fat" v={Number(manualItem.fat) || 0} onChange={(v) => setManualItem({ ...manualItem, fat: v })} theme={theme} />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Button mode="outlined" style={{ flex: 1 }} onPress={() => { setShowAddManual(false); setManualItem({ name: "", qty: "1", unit: "", calories: "", protein: "", carbs: "", fat: "" }); }}>Cancel</Button>
              <Button mode="contained" style={{ flex: 1 }} onPress={addManual}>Add</Button>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Selector Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton icon="chevron-left" size={22} onPress={() => setSelectedDate((d) => subDays(d, 1))} />
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              {isToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "long" })}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconButton icon="chevron-right" size={22} onPress={() => setSelectedDate((d) => addDays(d, 1))} disabled={isToday} />
            <IconButton icon="calendar" size={22} onPress={() => setShowDatePicker(true)} />
            <FloatingHamburger inline colors={hbColors} footer={themeToggleFooter}
              menuItems={[
                { label: "About Us", onPress: () => navigation?.navigate("About") },
                { label: "Support", onPress: () => Linking.openURL("https://freesurf.tools/support") },
                { label: "Privacy", onPress: () => Linking.openURL("https://freesurf.tools/privacy") },
                { label: "Terms", onPress: () => Linking.openURL("https://freesurf.tools/terms") },
              ]}
            />
          </View>
        </View>
      </View>
      <DatePickerModal
        locale="en"
        mode="single"
        visible={showDatePicker}
        date={selectedDate}
        onConfirm={({ date }) => { if (date) { setSelectedDate(date); setShowDatePicker(false); } }}
        onDismiss={() => setShowDatePicker(false)}
        validRange={{ endDate: new Date() }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Summary card */}
        <Card style={{ margin: 16 }} mode="contained">
          <Card.Content style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text variant="displaySmall" style={{ fontWeight: "800" }}>{tc.toLocaleString()}</Text>
              <TouchableGoal goal={goal} onPress={() => { setGoalInput(String(goal)); setShowGoalDialog(true); }} />
            </View>
            <View>
              <ProgressBar progress={goal > 0 ? Math.min(1, tc / goal) : 0} color={tc > goal ? theme.colors.error : theme.colors.primary} style={{ height: 8, borderRadius: 4 }} />
              <Text variant="labelSmall" style={{ marginTop: 4, color: rem > 0 ? theme.colors.onSurfaceVariant : theme.colors.error }}>
                {rem > 0 ? `${rem.toLocaleString()} cal left` : "Goal met"}
              </Text>
            </View>
            <MacroBar label="Protein" value={tp} unit="g" color={theme.colors.primary} />
            <MacroBar label="Carbs" value={tcb} unit="g" color="#f0a060" />
            <MacroBar label="Fat" value={tf} unit="g" color={theme.colors.error} />
          </Card.Content>
        </Card>

        {/* Mini 7-day bars */}
        <Card style={{ marginHorizontal: 16, marginBottom: 8 }} mode="contained">
          <Card.Content>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 80 }}>
              {wd.map((d, i) => {
                const mx = Math.max(...wd.map((x) => x.c), goal);
                const h = Math.max(4, (d.c / mx) * 56);
                return (
                  <View key={i} style={{ alignItems: "center", flex: 1, gap: 3 }}>
                    <Text variant="labelSmall" style={{ fontSize: 9, color: d.c > 0 ? theme.colors.onSurface : "transparent" }}>{d.c}</Text>
                    <View style={{ width: 24, height: h, minHeight: 4, borderRadius: 4, backgroundColor: d.selected ? theme.colors.primary : d.c > goal ? theme.colors.error : theme.colors.outline }} />
                    <Text variant="labelSmall" style={{ fontSize: 10, fontWeight: d.selected ? "700" : "400" }}>{d.l}</Text>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Meal log */}
        {todayMeals.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Utensils size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: "600", marginTop: 12 }}>No meals logged</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {isToday ? "Tap the camera to log your first meal" : "No data for this day"}
            </Text>
          </View>
        ) : todayMeals.map((e) => (
          <Card key={e.id} style={{ marginHorizontal: 16, marginBottom: 8 }} mode="contained">
            <Card.Content style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {e.items.map((i) => `${i.name}${i.qty ? ` (${i.qty}${i.unit ? ` ${i.unit}` : ""})` : ""}`).join(", ")}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{Math.round(e.items.reduce((a, i) => a + i.calories * (Number(i.qty) || 1), 0))} kcal</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconButton icon="pencil" size={18} onPress={() => setEditEntry({ ...e, items: e.items.map(it => ({...it})) })} />
                <IconButton icon="delete-outline" size={20} onPress={() => del(e.id)} />
              </View>
            </Card.Content>
          </Card>
        ))}
        {todayMeals.length === 0 && <View style={{ height: 300 }} />}
      </ScrollView>

      <View style={{ position: "absolute", right: 16, bottom: 16, flexDirection: "row", backgroundColor: theme.colors.primaryContainer, borderRadius: 28, overflow: "hidden" }}>
        <TouchableOpacity onPress={openCam} disabled={isAnalyzing} style={{ paddingHorizontal: 18, paddingVertical: 14, justifyContent: "center", alignItems: "center" }}>
          {isAnalyzing ? (
            <ActivityIndicator size={22} color={theme.colors.onSurface} />
          ) : (
            <Camera size={22} color={theme.colors.onSurface} />
          )}
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: theme.colors.outline }} />
        <TouchableOpacity onPress={() => setShowAddManual(true)} style={{ paddingHorizontal: 18, paddingVertical: 14, justifyContent: "center", alignItems: "center" }}>
          <Pencil size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
      {isAnalyzing && (
        <View style={{ position: "absolute", right: 16, bottom: 72, backgroundColor: theme.colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.outline, elevation: 2 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Processing photo...</Text>
        </View>
      )}
    </View>
  );
}

function TouchableGoal({ goal, onPress }: { goal: number; onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      <Text variant="bodyMedium" style={{ color: "#5f6b7a" }}>/ {goal.toLocaleString()} cal</Text>
      <IconButton icon="pencil" size={16} iconColor="#5f6b7a" onPress={onPress} />
    </View>
  );
}

function UnitPicker({ item, onChange, theme }: { item: { unit?: string }; onChange: (v: string) => void; theme: any }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignItems: "center" }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600", marginBottom: 2 }}>Unit</Text>
      <Button mode="outlined" compact style={{ height: 40, minWidth: 70 }} onPress={() => setOpen(true)} labelStyle={{ fontSize: 12 }}>
        {item.unit || "select"}
      </Button>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 40 }} activeOpacity={1} onPress={() => setOpen(false)}>
          <Surface style={{ borderRadius: 12, padding: 8 }}>
            <ScrollView style={{ maxHeight: 320 }}>
              {UNITS.map((u) => (
                <Button key={u} mode="text" onPress={() => { onChange(u); setOpen(false); }}
                  textColor={item.unit === u ? theme.colors.primary : theme.colors.onSurface}>
                  {u || "(none)"}
                </Button>
              ))}
            </ScrollView>
          </Surface>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MI({ l, v, onChange, theme }: { l: string; v: number; onChange: (v: string) => void; theme: any }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600", marginBottom: 2 }}>{l}</Text>
      <TextInput mode="outlined" dense style={{ width: "100%", textAlign: "center" }}
        value={v > 0 ? String(v) : ""} onChangeText={onChange} placeholder="0" keyboardType="numeric" />
    </View>
  );
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text variant="labelSmall" style={{ width: 44, color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <ProgressBar progress={Math.min(1, value / Math.max(value, 50))} color={color} style={{ flex: 1, height: 6, borderRadius: 3 }} />
      <Text variant="labelSmall" style={{ width: 44, textAlign: "right", color: theme.colors.onSurfaceVariant }}>{value}{unit}</Text>
    </View>
  );
}
