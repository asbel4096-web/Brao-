import type { Timestamp } from "firebase/firestore";

/**
 * سوق الجمعة (Friday Market)
 * ============================================================
 * حدث أسبوعي يفتح يوم الجمعة فقط، يتيح نشراً سريعاً (صورة + اسم + سعر + هاتف).
 *
 * نماذج البيانات في Firestore:
 *   config/fridayMarket              ← إعدادات السوق (يديرها الأدمن)
 *   fridayMarket/{itemId}            ← إعلان داخل السوق
 *   fridayMarketWeeks/{weekKey}      ← ملخّص كل جلسة جمعة (للأرشيف + العدّاد)
 *
 * النشر يتم عبر API route (server) لفرض "الجمعة فقط" وضبط weekKey + الوقت
 * بدقّة. القراءة عامة (client). الإدارة (تمييز/أرشفة/حذف) server-side فقط.
 */

export type FridayMarketCategory =
  | "cars"
  | "parts"
  | "oils"
  | "bikes"
  | "damaged";

export interface FridayCategoryMeta {
  key: FridayMarketCategory;
  label: string;
  emoji: string;
}

/** أقسام سوق الجمعة (مستقلّة عن أقسام الموقع الرئيسية). */
export const FRIDAY_CATEGORIES: FridayCategoryMeta[] = [
  { key: "cars", label: "سيارات", emoji: "🚗" },
  { key: "parts", label: "قطع غيار", emoji: "🔧" },
  { key: "oils", label: "زيوت ومواد مضافة", emoji: "🛢️" },
  { key: "bikes", label: "دراجات", emoji: "🏍️" },
  { key: "damaged", label: "سيارات بها حوادث", emoji: "💥" },
];

export const FRIDAY_CATEGORY_KEYS: FridayMarketCategory[] =
  FRIDAY_CATEGORIES.map((c) => c.key);

export function fridayCategoryLabel(key: string | undefined): string {
  return FRIDAY_CATEGORIES.find((c) => c.key === key)?.label || "غير مصنّف";
}

export function fridayCategoryEmoji(key: string | undefined): string {
  return FRIDAY_CATEGORIES.find((c) => c.key === key)?.emoji || "🛒";
}

export type FridayItemStatus = "active" | "archived" | "removed";

/** إعلان داخل سوق الجمعة. */
export interface FridayMarketItem {
  id: string;
  title: string;
  price: number;
  phone: string;
  whatsapp?: string;
  images: string[];
  category: FridayMarketCategory | string;
  city?: string;

  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;

  /** مفتاح جلسة الجمعة (مثل "FM-2026-06-19") — يجمع إعلانات نفس اليوم. */
  weekKey: string;
  /** وصف بشري لليوم (مثل "الجمعة 19 يونيو 2026"). */
  weekLabel?: string;

  status: FridayItemStatus;

  /** قسم الإعلانات المميّزة أعلى الصفحة — يضبطه الأدمن فقط. */
  featured?: boolean;
  featuredAt?: Timestamp | null;
  featuredBy?: string;

  views?: number;

  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/** ملخّص جلسة جمعة واحدة (للأرشيف). */
export interface FridayMarketWeek {
  weekKey: string;
  label: string;
  /** تاريخ بداية الجلسة (الجمعة) بصيغة ISO. */
  fridayISO: string;
  count: number;
  createdAt?: Timestamp | null;
}

/** إعدادات السوق (config/fridayMarket). */
export interface FridayMarketSettings {
  enabled: boolean;
  /** يوم الفتح: 0=الأحد ... 5=الجمعة ... 6=السبت (افتراضي 5). */
  openDay: number;
  /** ساعة الفتح بتوقيت ليبيا 0–23 (افتراضي 0 = منتصف الليل). */
  openHour: number;
  /** مدّة بقاء السوق مفتوحاً بالساعات (افتراضي 24). */
  durationHours: number;

  /** نص بانر الصفحة الرئيسية. */
  bannerTitle?: string;
  bannerSubtitle?: string;
  /** صورة خلفية اختيارية للبانر (URL). */
  bannerImageUrl?: string;

  /** إظهار رابط الأرشيف للمستخدمين. */
  showArchive?: boolean;

  /** آخر جمعة أُرسل لها إشعار الفتح (weekKey) — لمنع الإرسال المكرّر. */
  lastNotifiedWeek?: string;
  lastNotifiedAt?: unknown;
}

export const DEFAULT_FRIDAY_SETTINGS: FridayMarketSettings = {
  enabled: true,
  openDay: 5, // الجمعة
  openHour: 0, // منتصف الليل
  durationHours: 24, // طوال يوم الجمعة
  bannerTitle: "🛒 سوق الجمعة",
  bannerSubtitle: "عروض الجمعة فقط — انشر واشترِ بسرعة",
  showArchive: true,
};

/** الحدّ الأقصى لصور الإعلان الواحد (نشر سريع). */
export const FRIDAY_MAX_IMAGES = 4;
/** الحدّ الأقصى لطول الاسم المختصر. */
export const FRIDAY_TITLE_MAX = 60;
