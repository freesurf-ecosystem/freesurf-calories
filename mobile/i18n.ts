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
    languageLabel: "Language",
    goPro: "Go Pro", proBadge: "PRO", proTitle: "Calorie Tracker Pro",
    proSubtitle: "Unlimited AI food logging for power users.",
    proPrice: "$20", proPerMonth: "/ month",
    featureUnlimited: "Unlimited AI food logging",
    featureNoAds: "No ads",
    subscribeCta: "Subscribe", restoreCta: "Restore Purchase",
    activatedMsg: "Subscription activated. Enjoy Pro!",
    restoredMsg: "Your purchases have been restored.",
    cancelAnytime: "Cancel anytime in Google Play or the App Store.",
    termsLink: "Terms of Service", privacyLink: "Privacy Policy", eulaLink: "EULA",
    proNote: "Subscriptions keep the free tier free for everyone.",
  },
  es: {
    goPro: "Hazte Pro", languageLabel: "Idioma",
    proSubtitle: "Registro de comidas con IA ilimitado para usuarios avanzados.",
    proPerMonth: "/ mes",
    featureUnlimited: "Registro de comidas con IA ilimitado",
    featureNoAds: "Sin anuncios",
    subscribeCta: "Suscribirse",
    restoreCta: "Restaurar compra",
    activatedMsg: "Suscripción activada. ¡Disfruta Pro!",
    restoredMsg: "Tus compras se han restaurado.",
    cancelAnytime: "Cancela cuando quieras en Google Play o App Store.",
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
    goPro: "Passer à Pro", languageLabel: "Langue",
    proSubtitle: "Journalisation alimentaire par IA illimitée pour les utilisateurs avancés.",
    proPerMonth: "/ mois",
    featureUnlimited: "Journalisation alimentaire par IA illimitée",
    featureNoAds: "Sans publicité",
    subscribeCta: "S'abonner",
    restoreCta: "Restaurer l'achat",
    activatedMsg: "Abonnement activé. Profitez de Pro !",
    restoredMsg: "Vos achats ont été restaurés.",
    cancelAnytime: "Annulez à tout moment dans Google Play ou l'App Store.",
    dailyGoal: "Objectif calorique quotidien", quickAdd: "Ajout rapide", lookUpCalories: "Rechercher les calories",
    add: "Ajouter", save: "Enregistrer", cancel: "Annuler", noMeals: "Aucun repas enregistré",
    processingPhoto: "Traitement de la photo...", unit: "Unité", confirmMeal: "Confirmer le repas",
    foodName: "Nom de l'aliment", menuSupport: "Assistance", menuPrivacy: "Confidentialité", menuTerms: "Conditions",
  },
  de: {
    goPro: "Pro werden", languageLabel: "Sprache",
    proSubtitle: "Unbegrenztes KI-Lebensmittel-Logging für Power-User.",
    proPerMonth: "/ Monat",
    featureUnlimited: "Unbegrenztes KI-Lebensmittel-Logging",
    featureNoAds: "Keine Werbung",
    subscribeCta: "Abonnieren",
    restoreCta: "Kauf wiederherstellen",
    activatedMsg: "Abonnement aktiviert. Viel Spaß mit Pro!",
    restoredMsg: "Ihre Käufe wurden wiederhergestellt.",
    cancelAnytime: "Jederzeit in Google Play oder im App Store kündbar.",
    dailyGoal: "Tägliches Kalorienziel", quickAdd: "Schnell hinzufügen", lookUpCalories: "Kalorien nachschlagen",
    add: "Hinzufügen", save: "Speichern", cancel: "Abbrechen", noMeals: "Keine Mahlzeiten erfasst",
    processingPhoto: "Foto wird verarbeitet...", unit: "Einheit", confirmMeal: "Mahlzeit bestätigen",
    foodName: "Lebensmittelname", menuSupport: "Support", menuPrivacy: "Datenschutz", menuTerms: "Bedingungen",
  },
  it: {
    goPro: "Passa a Pro", languageLabel: "Lingua",
    proSubtitle: "Registro alimentare con IA illimitato per utenti esperti.",
    proPerMonth: "/ mese",
    featureUnlimited: "Registro alimentare con IA illimitato",
    featureNoAds: "Nessuna pubblicità",
    subscribeCta: "Abbonati",
    restoreCta: "Ripristina acquisto",
    activatedMsg: "Abbonamento attivato. Buon Pro!",
    restoredMsg: "I tuoi acquisti sono stati ripristinati.",
    cancelAnytime: "Annulla in qualsiasi momento su Google Play o App Store.",
    dailyGoal: "Obiettivo calorico giornaliero", quickAdd: "Aggiunta rapida", lookUpCalories: "Cerca calorie",
    add: "Aggiungi", save: "Salva", cancel: "Annulla", noMeals: "Nessun pasto registrato",
    processingPhoto: "Elaborazione foto...", unit: "Unità", confirmMeal: "Conferma pasto",
    foodName: "Nome alimento", menuSupport: "Supporto", menuPrivacy: "Privacy", menuTerms: "Termini",
  },
  pt: {
    goPro: "Seja Pro", languageLabel: "Idioma",
    proSubtitle: "Registro de refeições com IA ilimitado para usuários avançados.",
    proPerMonth: "/ mês",
    featureUnlimited: "Registro de refeições com IA ilimitado",
    featureNoAds: "Sem anúncios",
    subscribeCta: "Assinar",
    restoreCta: "Restaurar compra",
    activatedMsg: "Assinatura ativada. Aproveite o Pro!",
    restoredMsg: "Suas compras foram restauradas.",
    cancelAnytime: "Cancele quando quiser no Google Play ou na App Store.",
    dailyGoal: "Meta calórica diária", quickAdd: "Adição rápida", lookUpCalories: "Pesquisar calorias",
    add: "Adicionar", save: "Salvar", cancel: "Cancelar", noMeals: "Nenhuma refeição registrada",
    processingPhoto: "Processando foto...", unit: "Unidade", confirmMeal: "Confirmar refeição",
    foodName: "Nome do alimento", menuSupport: "Suporte", menuPrivacy: "Privacidade", menuTerms: "Termos",
  },
  ru: {
    goPro: "Перейти на Pro", languageLabel: "Язык",
    proSubtitle: "Неограниченное ведение дневника питания с ИИ для опытных пользователей.",
    proPerMonth: "/ месяц",
    featureUnlimited: "Неограниченное ведение дневника питания с ИИ",
    featureNoAds: "Без рекламы",
    subscribeCta: "Подписаться",
    restoreCta: "Восстановить покупку",
    activatedMsg: "Подписка активирована. Наслаждайтесь Pro!",
    restoredMsg: "Ваши покупки восстановлены.",
    cancelAnytime: "Отменить в любое время в Google Play или App Store.",
    dailyGoal: "Дневная цель калорий", quickAdd: "Быстрое добавление", lookUpCalories: "Найти калории",
    add: "Добавить", save: "Сохранить", cancel: "Отмена", noMeals: "Нет записанных приёмов пищи",
    processingPhoto: "Обработка фото...", unit: "Единица", confirmMeal: "Подтвердить приём пищи",
    foodName: "Название продукта", menuSupport: "Поддержка", menuPrivacy: "Конфиденциальность", menuTerms: "Условия",
  },
  tr: {
    goPro: "Pro'ya Geç", languageLabel: "Dil",
    proSubtitle: "Güç kullanıcıları için sınırsız yapay zeka yemek kaydı.",
    proPerMonth: "/ ay",
    featureUnlimited: "Sınırsız yapay zeka yemek kaydı",
    featureNoAds: "Reklam yok",
    subscribeCta: "Abone Ol",
    restoreCta: "Satın alımı geri yükle",
    activatedMsg: "Abonelik etkinleştirildi. Pro'nun tadını çıkarın!",
    restoredMsg: "Satın alımlarınız geri yüklendi.",
    cancelAnytime: "Google Play veya App Store'da istediğiniz zaman iptal edin.",
    dailyGoal: "Günlük kalori hedefi", quickAdd: "Hızlı ekle", lookUpCalories: "Kalori ara",
    add: "Ekle", save: "Kaydet", cancel: "İptal", noMeals: "Kayıtlı öğün yok",
    processingPhoto: "Fotoğraf işleniyor...", unit: "Birim", confirmMeal: "Öğünü onayla",
    foodName: "Yiyecek adı", menuSupport: "Destek", menuPrivacy: "Gizlilik", menuTerms: "Koşullar",
  },
  hi: {
    goPro: "Pro लें", languageLabel: "भाषा",
    proSubtitle: "पावर यूज़र्स के लिए असीमित AI भोजन लॉगिंग।",
    proPerMonth: "/ माह",
    featureUnlimited: "असीमित AI भोजन लॉगिंग",
    featureNoAds: "कोई विज्ञापन नहीं",
    subscribeCta: "सदस्यता लें",
    restoreCta: "खरीद पुनर्स्थापित करें",
    activatedMsg: "सदस्यता सक्रिय हो गई। Pro का आनंद लें!",
    restoredMsg: "आपकी खरीदारी बहाल कर दी गई है।",
    cancelAnytime: "Google Play या App Store में कभी भी रद्द करें।",
    dailyGoal: "दैनिक कैलोरी लक्ष्य", quickAdd: "त्वरित जोड़ें", lookUpCalories: "कैलोरी खोजें",
    add: "जोड़ें", save: "सहेजें", cancel: "रद्द करें", noMeals: "कोई भोजन दर्ज नहीं",
    processingPhoto: "फोटो प्रोसेस हो रही है...", unit: "इकाई", confirmMeal: "भोजन की पुष्टि करें",
    foodName: "खाद्य का नाम", menuSupport: "सहायता", menuPrivacy: "गोपनीयता", menuTerms: "शर्तें",
  },
  id: {
    goPro: "Jadi Pro", languageLabel: "Bahasa",
    proSubtitle: "Pencatatan makanan AI tanpa batas untuk pengguna mahir.",
    proPerMonth: "/ bulan",
    featureUnlimited: "Pencatatan makanan AI tanpa batas",
    featureNoAds: "Tanpa iklan",
    subscribeCta: "Berlangganan",
    restoreCta: "Pulihkan pembelian",
    activatedMsg: "Langganan aktif. Nikmati Pro!",
    restoredMsg: "Pembelian Anda telah dipulihkan.",
    cancelAnytime: "Batalkan kapan saja di Google Play atau App Store.",
    dailyGoal: "Target kalori harian", quickAdd: "Tambah cepat", lookUpCalories: "Cari kalori",
    add: "Tambah", save: "Simpan", cancel: "Batal", noMeals: "Belum ada makanan dicatat",
    processingPhoto: "Memproses foto...", unit: "Satuan", confirmMeal: "Konfirmasi makanan",
    foodName: "Nama makanan", menuSupport: "Dukungan", menuPrivacy: "Privasi", menuTerms: "Ketentuan",
  },
  vi: {
    goPro: "Nâng cấp Pro", languageLabel: "Ngôn ngữ",
    proSubtitle: "Ghi nhật ký bữa ăn bằng AI không giới hạn cho người dùng nâng cao.",
    proPerMonth: "/ tháng",
    featureUnlimited: "Ghi nhật ký bữa ăn bằng AI không giới hạn",
    featureNoAds: "Không quảng cáo",
    subscribeCta: "Đăng ký",
    restoreCta: "Khôi phục giao dịch",
    activatedMsg: "Đã kích hoạt đăng ký. Tận hưởng Pro!",
    restoredMsg: "Giao dịch của bạn đã được khôi phục.",
    cancelAnytime: "Hủy bất cứ lúc nào trong Google Play hoặc App Store.",
    dailyGoal: "Mục tiêu calo hằng ngày", quickAdd: "Thêm nhanh", lookUpCalories: "Tra cứu calo",
    add: "Thêm", save: "Lưu", cancel: "Hủy", noMeals: "Chưa có bữa ăn nào",
    processingPhoto: "Đang xử lý ảnh...", unit: "Đơn vị", confirmMeal: "Xác nhận bữa ăn",
    foodName: "Tên thực phẩm", menuSupport: "Hỗ trợ", menuPrivacy: "Quyền riêng tư", menuTerms: "Điều khoản",
  },
  th: {
    goPro: "อัปเกรด Pro", languageLabel: "ภาษา",
    proSubtitle: "บันทึกอาหารด้วย AI ไม่จำกัดสำหรับผู้ใช้ขั้นสูง",
    proPerMonth: "/ เดือน",
    featureUnlimited: "บันทึกอาหารด้วย AI ไม่จำกัด",
    featureNoAds: "ไม่มีโฆษณา",
    subscribeCta: "สมัครสมาชิก",
    restoreCta: "กู้คืนการซื้อ",
    activatedMsg: "เปิดใช้งานการสมัครแล้ว เพลิดเพลินกับ Pro!",
    restoredMsg: "กู้คืนการซื้อของคุณแล้ว",
    cancelAnytime: "ยกเลิกได้ทุกเมื่อใน Google Play หรือ App Store",
    dailyGoal: "เป้าหมายแคลอรี่รายวัน", quickAdd: "เพิ่มอย่างรวดเร็ว", lookUpCalories: "ค้นหาแคลอรี่",
    add: "เพิ่ม", save: "บันทึก", cancel: "ยกเลิก", noMeals: "ยังไม่มีมื้ออาหารที่บันทึก",
    processingPhoto: "กำลังประมวลผลภาพ...", unit: "หน่วย", confirmMeal: "ยืนยันมื้ออาหาร",
    foodName: "ชื่ออาหาร", menuSupport: "การสนับสนุน", menuPrivacy: "ความเป็นส่วนตัว", menuTerms: "ข้อกำหนด",
  },
  ja: {
    goPro: "Pro にする", languageLabel: "言語",
    proSubtitle: "パワーユーザー向けの無制限AI食事記録。",
    proPerMonth: "/ 月",
    featureUnlimited: "無制限のAI食事記録",
    featureNoAds: "広告なし",
    subscribeCta: "登録する",
    restoreCta: "購入を復元",
    activatedMsg: "登録が完了しました。Proをお楽しみください！",
    restoredMsg: "購入を復元しました。",
    cancelAnytime: "Google Play または App Store でいつでも解約できます。",
    dailyGoal: "1日のカロリー目標", quickAdd: "クイック追加", lookUpCalories: "カロリーを調べる",
    add: "追加", save: "保存", cancel: "キャンセル", noMeals: "記録された食事はありません",
    processingPhoto: "写真を処理中...", unit: "単位", confirmMeal: "食事を確認",
    foodName: "食品名", menuSupport: "サポート", menuPrivacy: "プライバシー", menuTerms: "利用規約",
  },
  ko: {
    goPro: "Pro로 업그레이드", languageLabel: "언어",
    proSubtitle: "파워 유저를 위한 무제한 AI 식사 기록.",
    proPerMonth: "/ 월",
    featureUnlimited: "무제한 AI 식사 기록",
    featureNoAds: "광고 없음",
    subscribeCta: "구독",
    restoreCta: "구매 복원",
    activatedMsg: "구독이 활성화되었습니다. Pro를 즐기세요!",
    restoredMsg: "구매가 복원되었습니다.",
    cancelAnytime: "Google Play 또는 App Store에서 언제든지 취소하세요.",
    dailyGoal: "일일 칼로리 목표", quickAdd: "빠른 추가", lookUpCalories: "칼로리 검색",
    add: "추가", save: "저장", cancel: "취소", noMeals: "기록된 식사가 없음",
    processingPhoto: "사진 처리 중...", unit: "단위", confirmMeal: "식사 확인",
    foodName: "음식 이름", menuSupport: "지원", menuPrivacy: "개인정보", menuTerms: "약관",
  },
  zh: {
    goPro: "升级 Pro", languageLabel: "语言",
    proSubtitle: "为高级用户提供无限 AI 饮食记录。",
    proPerMonth: "/ 月",
    featureUnlimited: "无限 AI 饮食记录",
    featureNoAds: "无广告",
    subscribeCta: "订阅",
    restoreCta: "恢复购买",
    activatedMsg: "订阅已激活。尽情享受 Pro！",
    restoredMsg: "您的购买已恢复。",
    cancelAnytime: "可随时在 Google Play 或 App Store 取消。",
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

export function translationsFor(lang: Lang): Strings {
  const en = translations[DEFAULT_LANG] ?? {};
  return { ...en, ...(translations[lang] ?? {}) };
}

// Module-level shared language state so every component that calls useAppLanguage()
// re-renders when the language changes (dashboard, menus, paywall, etc.).
let currentCode: string | null = null;
let loadedFlag = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loadPromise) return loadPromise;
  loadPromise = AsyncStorage.getItem(LANG_KEY)
    .then((v) => { if (v) currentCode = v; })
    .catch(() => {})
    .finally(() => { loadedFlag = true; emit(); });
  return loadPromise;
}

export function setAppLanguage(code: string) {
  currentCode = code;
  AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  emit();
}

export function useAppLanguage(): {
  lang: Lang;
  loaded: boolean;
  chosen: boolean;
  chosenCode: string | null;
  setLanguage: (code: string) => void;
} {
  const [, force] = useState(0);
  useEffect(() => {
    ensureLoaded();
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  const lang = normalizeLang(currentCode ?? deviceLang());
  return {
    lang,
    loaded: loadedFlag,
    chosen: loadedFlag && currentCode !== null,
    chosenCode: currentCode,
    setLanguage: setAppLanguage,
  };
}
