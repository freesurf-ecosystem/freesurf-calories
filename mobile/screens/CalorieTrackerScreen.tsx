import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, Modal, ScrollView, TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WORKER_URL = "https://calorietracker.freesurf.tools";
const LOG_KEY = "freesurf-calorie-log";
const GOAL_KEY = "freesurf-calorie-goal";

interface FoodItem { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; }
interface MealEntry { id: string; items: FoodItem[]; imageUri?: string; ts: number; }

export default function CalorieTrackerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [log, setLog] = useState<MealEntry[]>([]);
  const [goal, setGoal] = useState(2000);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [manualItem, setManualItem] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    try {
      const [lr, gr] = await Promise.all([AsyncStorage.getItem(LOG_KEY), AsyncStorage.getItem(GOAL_KEY)]);
      if (lr) setLog(JSON.parse(lr));
      if (gr) setGoal(Number(gr));
    } catch {}
  }
  async function saveLog(u: MealEntry[]) { setLog(u); await AsyncStorage.setItem(LOG_KEY, JSON.stringify(u)); }

  const td = new Date().toDateString();
  const today = log.filter((e) => new Date(e.ts).toDateString() === td);
  const tc = today.reduce((s, e) => s + e.items.reduce((a, i) => a + i.calories, 0), 0);
  const tp = today.reduce((s, e) => s + e.items.reduce((a, i) => a + i.protein, 0), 0);
  const tcb = today.reduce((s, e) => s + e.items.reduce((a, i) => a + i.carbs, 0), 0);
  const tf = today.reduce((s, e) => s + e.items.reduce((a, i) => a + i.fat, 0), 0);
  const rem = Math.max(0, goal - tc);
  const pg = Math.min(1, tc / goal);

  const wd = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    const c = log.filter((e) => new Date(e.ts).toDateString() === ds).reduce((s, e) => s + e.items.reduce((a, i) => a + i.calories, 0), 0);
    return { l: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), c };
  });

  async function openCam() {
    if (!permission?.granted) { const r = await requestPermission(); if (!r.granted) { Alert.alert("Camera needed"); return; } }
    setShowCamera(true);
  }
  async function analyze(uri: string) {
    setShowCamera(false); setIsAnalyzing(true);
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const res = await fetch(`${WORKER_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_base64: b64 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const items: FoodItem[] = (data.items || []).map((it: any, i: number) => ({
        id: `ai-${Date.now()}-${i}`, name: it.name || "Unknown", calories: it.calories || 0, protein: it.protein || 0, carbs: it.carbs || 0, fat: it.fat || 0,
      }));
      setEditEntry({ id: Date.now().toString(), items, imageUri: uri, ts: Date.now() });
    } catch (e: any) { Alert.alert("Error", e.message || "Analysis failed."); }
    finally { setIsAnalyzing(false); }
  }
  async function pickLib() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled && r.assets[0]) analyze(r.assets[0].uri);
  }
  function saveEdit() { if (!editEntry || editEntry.items.length === 0) return; saveLog([editEntry, ...log]); setEditEntry(null); }
  function updItem(id: string, f: keyof FoodItem, v: string) {
    if (!editEntry) return;
    setEditEntry({ ...editEntry, items: editEntry.items.map((it) => it.id === id ? { ...it, [f]: f === "name" ? v : Number(v) || 0 } : it) });
  }
  function rmItem(id: string) { if (!editEntry) return; setEditEntry({ ...editEntry, items: editEntry.items.filter((i) => i.id !== id) }); }
  function addItem() { if (!editEntry) return; setEditEntry({ ...editEntry, items: [...editEntry.items, { id: `m-${Date.now()}`, name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }] }); }
  function addManual() {
    const c = Number(manualItem.calories) || 0;
    if (!manualItem.name.trim() && c === 0) return;
    saveLog([{ id: Date.now().toString(), items: [{ id: `man-${Date.now()}`, name: manualItem.name.trim() || "Quick add", calories: c, protein: Number(manualItem.protein) || 0, carbs: Number(manualItem.carbs) || 0, fat: Number(manualItem.fat) || 0 }], ts: Date.now() }, ...log]);
    setShowAddManual(false); setManualItem({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  }
  function del(id: string) { saveLog(log.filter((e) => e.id !== id)); }

  const R = 130; const SW = 9; const rad = (R - SW) / 2; const circ = 2 * Math.PI * rad; const off = circ * (1 - pg);

  return (
    <View style={s.c}>
      <Modal visible={showCamera} animationType="slide"><View style={s.cw}><CameraView style={s.ca} facing="back"><TouchableOpacity style={s.cx} onPress={() => setShowCamera(false)}><Text style={s.cxt}>✕</Text></TouchableOpacity><View style={s.ch}><Text style={s.cht}>Position food in frame</Text></View></CameraView></View></Modal>

      <Modal visible={!!editEntry} animationType="slide">
        <View style={s.ew}>
          <View style={s.eh}><TouchableOpacity onPress={() => setEditEntry(null)}><Text style={s.ec}>Cancel</Text></TouchableOpacity><Text style={s.et}>Confirm Meal</Text><TouchableOpacity onPress={saveEdit}><Text style={s.es}>Save</Text></TouchableOpacity></View>
          <ScrollView style={s.eb}>
            {editEntry?.imageUri && <Image source={{ uri: editEntry.imageUri }} style={s.ei} resizeMode="cover" />}
            {editEntry?.items.map((item) => (
              <View key={item.id} style={s.eit}>
                <View style={s.eir}><TextInput style={s.en} value={item.name} onChangeText={(v) => updItem(item.id, "name", v)} placeholder="Food name" placeholderTextColor="#5f6b7a" /><TouchableOpacity onPress={() => rmItem(item.id)}><Text style={s.er}>✕</Text></TouchableOpacity></View>
                <View style={s.em}><MI l="Cal" v={item.calories} onChange={(v) => updItem(item.id, "calories", v)} /><MI l="Prot" v={item.protein} onChange={(v) => updItem(item.id, "protein", v)} /><MI l="Carbs" v={item.carbs} onChange={(v) => updItem(item.id, "carbs", v)} /><MI l="Fat" v={item.fat} onChange={(v) => updItem(item.id, "fat", v)} /></View>
              </View>
            ))}
            <TouchableOpacity style={s.ea} onPress={addItem}><Text style={s.eat}>+ Add food item</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showAddManual} transparent animationType="slide">
        <View style={s.mo}><View style={s.ms}>
          <Text style={s.mt}>Quick Add</Text>
          <TextInput style={s.mi} placeholder="Food name" placeholderTextColor="#5f6b7a" value={manualItem.name} onChangeText={(v) => setManualItem({ ...manualItem, name: v })} />
          <View style={s.em}><MI l="Cal" v={Number(manualItem.calories) || 0} onChange={(v) => setManualItem({ ...manualItem, calories: v })} /><MI l="Prot" v={Number(manualItem.protein) || 0} onChange={(v) => setManualItem({ ...manualItem, protein: v })} /><MI l="Carbs" v={Number(manualItem.carbs) || 0} onChange={(v) => setManualItem({ ...manualItem, carbs: v })} /><MI l="Fat" v={Number(manualItem.fat) || 0} onChange={(v) => setManualItem({ ...manualItem, fat: v })} /></View>
          <View style={s.ma}><TouchableOpacity style={s.mc} onPress={() => setShowAddManual(false)}><Text style={s.mct}>Cancel</Text></TouchableOpacity><TouchableOpacity style={s.maa} onPress={addManual}><Text style={s.maat}>Add</Text></TouchableOpacity></View>
        </View></View>
      </Modal>

      <View style={s.h}><Text style={s.br}>FreeSurf</Text>
        <View style={s.tb}><TouchableOpacity onPress={() => setViewMode("day")} style={[s.t, viewMode === "day" && s.ta]}><Text style={[s.tt, viewMode === "day" && s.tta]}>Day</Text></TouchableOpacity><TouchableOpacity onPress={() => setViewMode("week")} style={[s.t, viewMode === "week" && s.ta]}><Text style={[s.tt, viewMode === "week" && s.tta]}>Week</Text></TouchableOpacity></View>
      </View>

      {viewMode === "day" ? (
        <View style={s.b}>
          <View style={s.rr}>
            <View style={s.rw}><svg width={R} height={R} viewBox={`0 0 ${R} ${R}`}><circle cx={R/2} cy={R/2} r={rad} stroke="#2a3568" strokeWidth={SW} fill="none" /><circle cx={R/2} cy={R/2} r={rad} stroke="#78e6c4" strokeWidth={SW} fill="none" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${R/2} ${R/2})`} /></svg><View style={s.rc}><Text style={s.rcl}>{rem}</Text><Text style={s.rlb}>left</Text></View></View>
            <View style={s.mc2}><Text style={s.mv}>{tc} <Text style={s.mu}>/ {goal}</Text></Text><Text style={s.msu}>P{tp}g · C{tcb}g · F{tf}g</Text></View>
          </View>
          <ScrollView style={s.ll}>
            {today.length === 0 ? <View style={s.em2}><Text style={s.emi}>🍽️</Text><Text style={s.emt}>No meals yet</Text></View> :
              today.map((e) => (
                <View key={e.id} style={s.lc}><View style={s.lcl}><Text style={s.ln}>{e.items.map((i) => i.name).join(", ")}</Text><Text style={s.lm}>{e.items.reduce((a, i) => a + i.calories, 0)} kcal</Text></View><TouchableOpacity onPress={() => del(e.id)}><Text style={s.ld}>🗑</Text></TouchableOpacity></View>
              ))}
          </ScrollView>
        </View>
      ) : (
        <View style={s.b}><View style={s.wc}><Text style={s.wt}>Last 7 Days</Text><View style={s.brr}>{wd.map((d, i) => { const mx = Math.max(...wd.map((x) => x.c), goal); const h = Math.max(4, (d.c / mx) * 140); return (<View key={i} style={s.bc}><Text style={s.bv}>{d.c > 0 ? d.c : ""}</Text><View style={[s.bar, { height: h }, d.c > goal && s.bo]} /><Text style={s.bl}>{d.l}</Text></View>); })}</View></View></View>
      )}

      <View style={s.bb}>
        <TouchableOpacity style={s.ab} onPress={() => setShowAddManual(true)}><Text style={s.abt}>+</Text></TouchableOpacity>
        <TouchableOpacity style={s.pb} onPress={openCam}>{isAnalyzing ? <ActivityIndicator color="#fff" /> : <Text style={s.pbt}>📷 Log Meal</Text>}</TouchableOpacity>
        <TouchableOpacity style={s.lb} onPress={pickLib}><Text style={s.lbt}>🖼</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function MI({ l, v, onChange }: { l: string; v: number; onChange: (v: string) => void }) {
  return <View style={ms.w}><Text style={ms.lb}>{l}</Text><TextInput style={ms.in} value={v > 0 ? String(v) : ""} onChangeText={onChange} placeholder="0" placeholderTextColor="#5f6b7a" keyboardType="numeric" /></View>;
}
const ms = StyleSheet.create({ w: { alignItems: "center", flex: 1 }, lb: { fontSize: 10, color: "#5f6b7a", fontWeight: "600", marginBottom: 2 }, in: { backgroundColor: "#0b1433", borderRadius: 8, padding: 8, fontSize: 13, color: "#e8ecff", textAlign: "center", borderWidth: 1, borderColor: "#2a3568", width: "100%" } });

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#0b1020" },
  h: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#111937", borderBottomWidth: 1, borderBottomColor: "#2a3568" },
  br: { fontSize: 13, fontWeight: "600", color: "#5b8cff" },
  tb: { flexDirection: "row", gap: 4 }, t: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }, ta: { backgroundColor: "#1e2a4a" }, tt: { fontSize: 14, color: "#5f6b7a", fontWeight: "500" }, tta: { color: "#e8ecff", fontWeight: "600" },
  b: { flex: 1 },
  rr: { flexDirection: "row", alignItems: "center", padding: 20, gap: 20, borderBottomWidth: 1, borderBottomColor: "#2a3568" },
  rw: { position: "relative", alignItems: "center", justifyContent: "center" }, rc: { position: "absolute", alignItems: "center" }, rcl: { fontSize: 28, fontWeight: "800", color: "#78e6c4" }, rlb: { fontSize: 11, color: "#5f6b7a" },
  mc2: { flex: 1 }, mv: { fontSize: 22, fontWeight: "700", color: "#e8ecff" }, mu: { fontSize: 14, fontWeight: "400", color: "#5f6b7a" }, msu: { fontSize: 12, color: "#b3bddf", marginTop: 6 },
  ll: { flex: 1, padding: 16 },
  em2: { alignItems: "center", paddingTop: 60 }, emi: { fontSize: 40, marginBottom: 12 }, emt: { fontSize: 16, fontWeight: "600", color: "#e8ecff" },
  lc: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#111937", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#2a3568" },
  lcl: { flex: 1 }, ln: { fontSize: 14, fontWeight: "600", color: "#e8ecff" }, lm: { fontSize: 12, color: "#78e6c4", marginTop: 2 }, ld: { fontSize: 16, padding: 4 },
  wc: { padding: 20 }, wt: { fontSize: 16, fontWeight: "700", color: "#e8ecff", marginBottom: 20 },
  brr: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 180 },
  bc: { alignItems: "center", flex: 1, gap: 4 }, bv: { fontSize: 10, color: "#5f6b7a" }, bar: { width: 28, backgroundColor: "#5b8cff", borderRadius: 6, minHeight: 4 }, bo: { backgroundColor: "#ef4444" }, bl: { fontSize: 11, color: "#5f6b7a", marginTop: 4 },
  bb: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingBottom: 36, backgroundColor: "#111937", borderTopWidth: 1, borderTopColor: "#2a3568" },
  ab: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e2a4a", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#2a3568" }, abt: { fontSize: 22, color: "#b3bddf", fontWeight: "300" },
  pb: { flex: 1, backgroundColor: "#5b8cff", borderRadius: 14, padding: 16, alignItems: "center" }, pbt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lb: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e2a4a", justifyContent: "center", alignItems: "center" }, lbt: { fontSize: 18 },
  cw: { flex: 1, backgroundColor: "#000" }, ca: { flex: 1 }, cx: { position: "absolute", top: 60, right: 20, zIndex: 10, padding: 8 }, cxt: { fontSize: 24, color: "#fff" }, ch: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 120 }, cht: { color: "rgba(255,255,255,0.5)", fontSize: 16, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: "hidden" },
  ew: { flex: 1, backgroundColor: "#0b1020" }, eh: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#111937", borderBottomWidth: 1, borderBottomColor: "#2a3568" }, ec: { fontSize: 15, color: "#f87171" }, et: { fontSize: 16, fontWeight: "700", color: "#e8ecff" }, es: { fontSize: 15, fontWeight: "700", color: "#78e6c4" },
  eb: { flex: 1, padding: 20 }, ei: { width: "100%", height: 200, borderRadius: 14, marginBottom: 20 },
  eit: { backgroundColor: "#111937", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#2a3568" }, eir: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }, en: { flex: 1, fontSize: 15, color: "#e8ecff", fontWeight: "600", backgroundColor: "#0b1433", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#2a3568" }, er: { fontSize: 18, color: "#f87171", padding: 4 },
  em: { flexDirection: "row", gap: 6 },
  ea: { backgroundColor: "#1e2a4a", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#2a3568", borderStyle: "dashed", marginTop: 4 }, eat: { color: "#5b8cff", fontSize: 14, fontWeight: "600" },
  mo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }, ms: { backgroundColor: "#111937", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 48 }, mt: { fontSize: 18, fontWeight: "700", color: "#e8ecff", marginBottom: 16 }, mi: { backgroundColor: "#0b1433", borderRadius: 12, padding: 14, fontSize: 15, color: "#e8ecff", borderWidth: 1, borderColor: "#2a3568", marginBottom: 16 },
  ma: { flexDirection: "row", gap: 12, marginTop: 20 }, mc: { flex: 1, backgroundColor: "#1e2a4a", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#2a3568" }, mct: { color: "#b3bddf", fontSize: 15, fontWeight: "600" }, maa: { flex: 1, backgroundColor: "#5b8cff", borderRadius: 12, padding: 14, alignItems: "center" }, maat: { color: "#fff", fontSize: 15, fontWeight: "700" },
});