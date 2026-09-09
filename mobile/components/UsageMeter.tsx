import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WORKER_URL } from "../lib/config";
import { getDeviceId } from "../lib/device";

const BASE = WORKER_URL.replace(/\/api\/analyze$/, "");

type Props = { colors: { dim: string; text: string } };

/** Shows how many of the monthly free analyses are left. Renders nothing when metering is off. */
export default function UsageMeter({ colors }: Props) {
  const [state, setState] = useState<"loading" | "ok" | "off">("loading");
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const res = await fetch(`${BASE}/api/usage`, { headers: { "X-Device-Id": deviceId } });
        const data = await res.json();
        if (active && res.ok && data?.usage) {
          setUsed(Number(data.usage.used) || 0);
          setLimit(Number(data.usage.limit) || 0);
          setState("ok");
        } else if (active) setState("off");
      } catch { if (active) setState("off"); }
    })();
    return () => { active = false; };
  }, []);

  if (state !== "ok") return null;
  const pct = limit > 0 ? Math.min(1, used / limit) * 100 : 0;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>Free analyses</Text>
      <Text style={[styles.value, { color: colors.dim }]}>{used} / {limit} this month</Text>
      <View style={[styles.track, { backgroundColor: colors.dim + "33" }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.text }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 15 },
  value: { fontSize: 13 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 2 },
  fill: { height: "100%", borderRadius: 3 },
});
