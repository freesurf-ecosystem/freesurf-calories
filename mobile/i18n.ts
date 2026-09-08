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
  fr: {
    dailyGoal: "Objectif calorique quotidien", quickAdd: "Ajout rapide", lookUpCalories: "Rechercher les calories",
    add: "Ajouter", save: "Enregistrer", cancel: "Annuler", noMeals: "Aucun repas enregistré",
    processingPhoto: "Traitement de la photo...", unit: "Unité", confirmMeal: "Confirmer le repas",
    foodName: "Nom de l'aliment", menuSupport: "Assistance", menuPrivacy: "Confidentialité", menuTerms: "Conditions",
  },
  de: {
    dailyGoal: "Tägliches Kalorienziel", quickAdd: "Schnell hinzufügen", lookUpCalories: "Kalorien nachschlagen",
    add: "Hinzufügen", save: "Speichern", cancel: "Abbrechen", noMeals: "Keine Mahlzeiten erfasst",
    processingPhoto: "Foto wird verarbeitet...", unit: "Einheit", confirmMeal: "Mahlzeit bestätigen",
    foodName: "Lebensmittelname", menuSupport: "Support", menuPrivacy: "Datenschutz", menuTerms: "Bedingungen",
  },
  it: {
    dailyGoal: "Obiettivo calorico giornaliero", quickAdd: "Aggiunta rapida", lookUpCalories: "Cerca calorie",
    add: "Aggiungi", save: "Salva", cancel: "Annulla", noMeals: "Nessun pasto registrato",
    processingPhoto: "Elaborazione foto...", unit: "Unità", confirmMeal: "Conferma pasto",
    foodName: "Nome alimento", menuSupport: "Supporto", menuPrivacy: "Privacy", menuTerms: "Termini",
  },
  pt: {
    dailyGoal: "Meta calórica diária", quickAdd: "Adição rápida", lookUpCalories: "Pesquisar calorias",
    add: "Adicionar", save: "Salvar", cancel: "Cancelar", noMeals: "Nenhuma refeição registrada",
    processingPhoto: "Processando foto...", unit: "Unidade", confirmMeal: "Confirmar refeição",
    foodName: "Nome do alimento", menuSupport: "Suporte", menuPrivacy: "Privacidade", menuTerms: "Termos",
  },
  ru: {
    dailyGoal: "Дневная цель калорий", quickAdd: "Быстрое добавление", lookUpCalories: "Найти калории",
    add: "Добавить", save: "Сохранить", cancel: "Отмена", noMeals: "Нет записанных приёмов пищи",
    processingPhoto: "Обработка фото...", unit: "Единица", confirmMeal: "Подтвердить приём пищи",
    foodName: "Название продукта", menuSupport: "Поддержка", menuPrivacy: "Конфиденциальность", menuTerms: "Условия",
  },
  tr: {
    dailyGoal: "Günlük kalori hedefi", quickAdd: "Hızlı ekle", lookUpCalories: "Kalori ara",
    add: "Ekle", save: "Kaydet", cancel: "İptal", noMeals: "Kayıtlı öğün yok",
    processingPhoto: "Fotoğraf işleniyor...", unit: "Birim", confirmMeal: "Öğünü onayla",
    foodName: "Yiyecek adı", menuSupport: "Destek", menuPrivacy: "Gizlilik", menuTerms: "Koşullar",
  },
  hi: {
    dailyGoal: "दैनिक कैलोरी लक्ष्य", quickAdd: "त्वरित जोड़ें", lookUpCalories: "कैलोरी खोजें",
    add: "जोड़ें", save: "सहेजें", cancel: "रद्द करें", noMeals: "कोई भोजन दर्ज नहीं",
    processingPhoto: "फोटो प्रोसेस हो रही है...", unit: "इकाई", confirmMeal: "भोजन की पुष्टि करें",
    foodName: "खाद्य का नाम", menuSupport: "सहायता", menuPrivacy: "गोपनीयता", menuTerms: "शर्तें",
  },
  id: {
    dailyGoal: "Target kalori harian", quickAdd: "Tambah cepat", lookUpCalories: "Cari kalori",
    add: "Tambah", save: "Simpan", cancel: "Batal", noMeals: "Belum ada makanan dicatat",
    processingPhoto: "Memproses foto...", unit: "Satuan", confirmMeal: "Konfirmasi makanan",
    foodName: "Nama makanan", menuSupport: "Dukungan", menuPrivacy: "Privasi", menuTerms: "Ketentuan",
  },
  vi: {
    dailyGoal: "Mục tiêu calo hằng ngày", quickAdd: "Thêm nhanh", lookUpCalories: "Tra cứu calo",
    add: "Thêm", save: "Lưu", cancel: "Hủy", noMeals: "Chưa có bữa ăn nào",
    processingPhoto: "Đang xử lý ảnh...", unit: "Đơn vị", confirmMeal: "Xác nhận bữa ăn",
    foodName: "Tên thực phẩm", menuSupport: "Hỗ trợ", menuPrivacy: "Quyền riêng tư", menuTerms: "Điều khoản",
  },
  th: {
    dailyGoal: "เป้าหมายแคลอรี่รายวัน", quickAdd: "เพิ่มอย่างรวดเร็ว", lookUpCalories: "ค้นหาแคลอรี่",
    add: "เพิ่ม", save: "บันทึก", cancel: "ยกเลิก", noMeals: "ยังไม่มีมื้ออาหารที่บันทึก",
    processingPhoto: "กำลังประมวลผลภาพ...", unit: "หน่วย", confirmMeal: "ยืนยันมื้ออาหาร",
    foodName: "ชื่ออาหาร", menuSupport: "การสนับสนุน", menuPrivacy: "ความเป็นส่วนตัว", menuTerms: "ข้อกำหนด",
  },
  ja: {
    dailyGoal: "1日のカロリー目標", quickAdd: "クイック追加", lookUpCalories: "カロリーを調べる",
    add: "追加", save: "保存", cancel: "キャンセル", noMeals: "記録された食事はありません",
    processingPhoto: "写真を処理中...", unit: "単位", confirmMeal: "食事を確認",
    foodName: "食品名", menuSupport: "サポート", menuPrivacy: "プライバシー", menuTerms: "利用規約",
  },
  ko: {
    dailyGoal: "일일 칼로리 목표", quickAdd: "빠른 추가", lookUpCalories: "칼로리 검색",
    add: "추가", save: "저장", cancel: "취소", noMeals: "기록된 식사가 없음",
    processingPhoto: "사진 처리 중...", unit: "단위", confirmMeal: "식사 확인",
    foodName: "음식 이름", menuSupport: "지원", menuPrivacy: "개인정보", menuTerms: "약관",
  },
  zh: {
    dailyGoal: "每日卡路里目标", quickAdd: "快速添加", lookUpCalories: "查找卡路里",
    add: "添加", save: "保存", cancel: "取消", noMeals: "暂无记录的餐食",
    processingPhoto: "正在处理照片...", unit: "单位", confirmMeal: "确认餐食",
    foodName: "食物名称", menuSupport: "支持", menuPrivacy: "隐私", menuTerms: "条款",
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
