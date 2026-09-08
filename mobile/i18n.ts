import { useEffect, useState } from "react";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Strings = Record<string, string>;
export type Lang = string;

export const translations: Record<Lang, Strings> = {
  en: {
    dailyGoal: "Daily calorie goal",
    quickAdd: "Quick Add",
    lookUpCalories: "Look up calories",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    noMeals: "No meals logged",
    processingPhoto: "Processing photo...",
    unit: "Unit",
    confirmMeal: "Confirm Meal",
    foodName: "Food name",
    menuSupport: "Support",
    menuPrivacy: "Privacy",
    menuTerms: "Terms",
  },
  es: {
    dailyGoal: "Objetivo diario de calorías",
    quickAdd: "Agregar rápido",
    lookUpCalories: "Buscar calorías",
    add: "Agregar",
    save: "Guardar",
    cancel: "Cancelar",
    noMeals: "No hay comidas registradas",
    processingPhoto: "Procesando foto...",
    unit: "Unidad",
    confirmMeal: "Confirmar comida",
    foodName: "Nombre del alimento",
    menuSupport: "Soporte",
    menuPrivacy: "Privacidad",
    menuTerms: "Términos",
  },
};

export const DEFAULT_LANG: Lang = "en";
const LANG_KEY = "freesurf-app-lang";

export function normalizeLang(code?: string | null): Lang {
  return code && translations[code] ? code : DEFAULT_LANG;
}

export function deviceLang(): Lang {
  try {
    return normalizeLang(getLocales()?.[0]?.languageCode);
  } catch {
    return DEFAULT_LANG;
  }
}

export function useAppLanguage(): {
  lang: Lang;
  loaded: boolean;
  chosen: boolean;
  chosenCode: string | null;
  setLanguage: (code: string) => void;
} {
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => { if (v) setChosenCode(v); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);
  const lang = normalizeLang(chosenCode ?? deviceLang());
  const setLanguage = (code: string) => {
    setChosenCode(code);
    AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  };
  return { lang, loaded, chosen: loaded && chosenCode !== null, chosenCode, setLanguage };
}
