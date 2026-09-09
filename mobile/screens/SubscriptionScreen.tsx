import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, Button, Surface, useTheme, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Check } from "lucide-react-native";
import Purchases, { type PurchasesError, type PurchasesPackage } from "react-native-purchases";
import { translationsFor, useAppLanguage } from "../i18n";

type Props = { onBack: () => void };

export default function SubscriptionScreen({ onBack }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lang } = useAppLanguage();
  const T = translationsFor(lang);
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [price, setPrice] = useState<string | null>(null);

  const features = [T.featureUnlimited, T.featureNoAds];

  useEffect(() => {
    (async () => {
      try {
        const { current } = await Purchases.getOfferings();
        const monthly = current?.monthly ?? current?.availablePackages?.[0] ?? null;
        if (monthly) {
          setPkg(monthly);
          setPrice(monthly.product.priceString);
        }
      } catch (e: any) {
        console.log("[Purchases] offerings error:", e?.message || e);
      }
    })();
  }, []);

  const onSubscribe = async () => {
    if (!pkg) {
      Alert.alert(T.proTitle, T.subscribeCta);
      return;
    }
    setBusy(true);
    try {
      await Purchases.purchasePackage(pkg);
      setBusy(false);
      Alert.alert(T.proTitle, T.activatedMsg);
    } catch (e: any) {
      setBusy(false);
      const err = e as PurchasesError;
      if (err?.userCancelled) return;
      Alert.alert(T.proTitle, T.subscribeCta);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      await Purchases.restorePurchases();
      setBusy(false);
      Alert.alert(T.restoreCta, T.restoredMsg);
    } catch (e: any) {
      setBusy(false);
      Alert.alert(T.restoreCta, T.restoredMsg);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Surface style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingTop: insets.top + 4, paddingBottom: 4, elevation: 0, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
        <IconButton icon="arrow-left" size={22} onPress={onBack} />
        <Text variant="titleMedium" style={{ fontWeight: "700" }}>{T.goPro}</Text>
      </Surface>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Crown color="#ffffff" size={30} />
          </View>
          <Text variant="headlineSmall" style={{ fontWeight: "800" }}>{T.proTitle}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 6 }}>{T.proSubtitle}</Text>
        </View>

        <Surface mode="flat" style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: theme.colors.outline, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", marginBottom: 16 }}>
            <Text variant="displaySmall" style={{ fontWeight: "800", color: theme.colors.primary }}>{price ?? T.proPrice}</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>{T.proPerMonth}</Text>
          </View>

          {features.map((text, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.primaryContainer, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Check color={theme.colors.primary} size={16} />
              </View>
              <Text variant="bodyLarge" style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </Surface>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", lineHeight: 18 }}>{T.proNote}</Text>
      </ScrollView>

      <Surface style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: theme.colors.outline, elevation: 0 }}>
        <Button
          mode="contained"
          onPress={onSubscribe}
          disabled={busy}
          loading={busy}
          contentStyle={{ height: 54 }}
          labelStyle={{ fontSize: 17, fontWeight: "700" }}
          icon={() => <Crown color="#ffffff" size={20} />}
        >
          {T.subscribeCta}
        </Button>
        <Button mode="text" onPress={onRestore} disabled={busy} style={{ marginTop: 6 }} labelStyle={{ fontSize: 15 }}>
          {T.restoreCta}
        </Button>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 6 }}>{T.cancelAnytime}</Text>
      </Surface>
    </View>
  );
}
