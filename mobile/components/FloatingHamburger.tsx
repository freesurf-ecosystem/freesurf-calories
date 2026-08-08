import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type MenuItem = { label: string; onPress: () => void };

type Props = {
  menuItems?: MenuItem[];
  colors?: { text: string; dim: string; card: string; border: string };
  topOffset?: number;
  footer?: React.ReactNode;
  inline?: boolean;
};

const DARK = { text: "#e8ecff", dim: "#8899bb", card: "#111937", border: "#2a3568" };

export default function FloatingHamburger({ menuItems, colors, topOffset = 56, footer, inline }: Props) {
  const [open, setOpen] = useState(false);
  const c = colors || DARK;

  if (!menuItems?.length && !footer) return null;

  return (
    <>
      <Pressable style={[inline ? styles.inlineBtn : styles.button, !inline && { top: topOffset }]} onPress={() => setOpen(true)} accessibilityLabel="Open menu">
        <View style={[styles.line, { backgroundColor: c.text }]} />
        <View style={[styles.line, { backgroundColor: c.text }]} />
        <View style={[styles.line, { backgroundColor: c.text }]} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: topOffset, backgroundColor: c.card, borderColor: c.border }]}>
            {menuItems?.map((item, i) => (
              <Pressable key={i} style={styles.item} onPress={() => { setOpen(false); item.onPress(); }}>
                <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
              </Pressable>
            ))}
            {footer && (
              <View style={[styles.footer, { borderTopColor: c.border }]}>
                {footer}
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", right: 16, zIndex: 100, padding: 8, gap: 5, justifyContent: "center", alignItems: "center" },
  inlineBtn: { padding: 8, gap: 5, justifyContent: "center", alignItems: "center" },
  line: { width: 22, height: 2, borderRadius: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menu: { position: "absolute", right: 16, borderRadius: 14, borderWidth: 1, paddingVertical: 6, minWidth: 210 },
  item: { paddingHorizontal: 20, paddingVertical: 13 },
  label: { fontSize: 15 },
  footer: { borderTopWidth: 1, marginTop: 4, paddingHorizontal: 20, paddingVertical: 12 },
});
