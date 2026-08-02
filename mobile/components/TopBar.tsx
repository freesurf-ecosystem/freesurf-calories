import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  appName: string;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggedIn: boolean;
  menuItems?: { label: string; onPress: () => void }[];
};

export default function TopBar({ appName, onSignIn, onSignOut, isLoggedIn, menuItems }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.bar}>
      <Text style={styles.brand}>{appName}</Text>
      <Pressable style={styles.hamburger} onPress={() => setOpen(true)} accessibilityLabel="Open menu">
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {menuItems?.map((item, i) => (
              <Pressable key={i} style={styles.item} onPress={() => { setOpen(false); item.onPress(); }}>
                <Text style={styles.label}>{item.label}</Text>
              </Pressable>
            ))}
            {menuItems && menuItems.length > 0 ? <View style={styles.divider} /> : null}
            {isLoggedIn ? (
              <Pressable style={styles.item} onPress={() => { setOpen(false); onSignOut(); }}>
                <Text style={styles.signOut}>Log out</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.item} onPress={() => { setOpen(false); onSignIn(); }}>
                <Text style={styles.label}>Sign in to sync</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#5b8cff" },
  hamburger: { padding: 6, gap: 5, justifyContent: "center", alignItems: "center" },
  line: { width: 22, height: 2, backgroundColor: "#e8ecff", borderRadius: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menu: {
    position: "absolute", top: 52, right: 20,
    backgroundColor: "#111937", borderRadius: 14,
    borderWidth: 1, borderColor: "#2a3568",
    paddingVertical: 6, minWidth: 210,
  },
  item: { paddingHorizontal: 20, paddingVertical: 13 },
  label: { fontSize: 15, color: "#e8ecff" },
  divider: { height: 1, backgroundColor: "#2a3568", marginVertical: 4 },
  signOut: { fontSize: 15, color: "#5f6b7a" },
});
