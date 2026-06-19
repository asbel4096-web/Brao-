import type { FridayMarketSettings } from "./types";

/**
 * منطق توقيت السوق — دوال صرفة (pure) بلا أي اعتماد على Firebase أو React،
 * كي تُستخدم على العميل (العدّاد) وعلى السيرفر (التحقّق + ضبط weekKey).
 *
 * المنطقة الزمنية: نعمل بتوقيت ليبيا الثابت (UTC+2، بلا توقيت صيفي).
 * نحسب "وقت ليبيا" يدوياً بإضافة الإزاحة إلى UTC، فلا نعتمد على منطقة
 * تشغيل السيرفر (Vercel يعمل بـUTC) ولا على منطقة جهاز المستخدم.
 */

const LIBYA_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2

export interface MarketState {
  /** هل السوق مفتوح الآن؟ */
  isOpen: boolean;
  /** بداية الجلسة الحالية/الأخيرة (ms, UTC). */
  sessionStart: number;
  /** نهاية الجلسة (ms, UTC). */
  sessionEnd: number;
  /** ملي ثانية متبقية حتى الإغلاق (0 لو مغلق). */
  msRemaining: number;
  /** ملي ثانية حتى الافتتاح القادم (0 لو مفتوح الآن). */
  msUntilOpen: number;
  /** مفتاح الجلسة الحالية/القادمة (مثل "FM-2026-06-19"). */
  weekKey: string;
  /** وصف بشري لليوم بالعربية. */
  weekLabel: string;
  /** تاريخ الجمعة (بداية الجلسة) بصيغة ISO. */
  fridayISO: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** يحوّل لحظة UTC إلى مكوّنات تاريخ بتوقيت ليبيا. */
function libyaParts(utcMs: number) {
  const d = new Date(utcMs + LIBYA_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(), // 0-11
    day: d.getUTCDate(),
    dow: d.getUTCDay(), // 0=الأحد .. 6=السبت
    hours: d.getUTCHours(),
  };
}

/** يبني لحظة UTC من تاريخ/ساعة بتوقيت ليبيا. */
function libyaToUtc(
  year: number,
  month: number,
  day: number,
  hour: number
): number {
  return Date.UTC(year, month, day, hour, 0, 0, 0) - LIBYA_OFFSET_MS;
}

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const AR_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function weekKeyFromStart(startMs: number): string {
  const p = libyaParts(startMs);
  return `FM-${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

function weekLabelFromStart(startMs: number): string {
  const p = libyaParts(startMs);
  return `${AR_DAYS[p.dow]} ${p.day} ${AR_MONTHS[p.month]} ${p.year}`;
}

/**
 * يحسب حالة السوق عند لحظة `now`.
 *
 * الفكرة: نوجد آخر "بداية جلسة" (اليوم المحدد + الساعة المحددة) عند أو قبل
 * `now` خلال آخر 7 أيام، ثم نتحقّق إن كنا داخل نافذة [start, start+duration).
 */
export function computeMarketState(
  settings: Pick<
    FridayMarketSettings,
    "openDay" | "openHour" | "durationHours"
  >,
  now: number = Date.now()
): MarketState {
  const openDay = clampInt(settings.openDay, 0, 6, 5);
  const openHour = clampInt(settings.openHour, 0, 23, 0);
  const durationHours = clampInt(settings.durationHours, 1, 168, 24);
  const durationMs = durationHours * 60 * 60 * 1000;

  const p = libyaParts(now);

  // كم يوماً يجب أن نرجع للوصول إلى آخر يوم-فتح (مثلاً الجمعة)؟
  let backDays = (p.dow - openDay + 7) % 7;

  // المرشّح: بداية الجلسة في ذلك اليوم بالساعة المحددة (بتوقيت ليبيا).
  let startMs = libyaToUtc(p.year, p.month, p.day - backDays, openHour);

  // لو كان اليوم هو يوم الفتح لكن لم تَحِن الساعة بعد، نرجع أسبوعاً كاملاً.
  if (startMs > now) {
    startMs = libyaToUtc(p.year, p.month, p.day - backDays - 7, openHour);
  }

  const endMs = startMs + durationMs;
  const isOpen = now >= startMs && now < endMs;

  let msUntilOpen = 0;
  let activeStart = startMs;
  if (!isOpen) {
    // الافتتاح القادم = نفس البداية + 7 أيام (أسبوع كامل) إن مضت الجلسة.
    const nextStart = startMs + 7 * 24 * 60 * 60 * 1000;
    msUntilOpen = Math.max(0, nextStart - now);
    activeStart = nextStart; // weekKey/label يشيران للجلسة القادمة عند الإغلاق
  }

  return {
    isOpen,
    sessionStart: startMs,
    sessionEnd: endMs,
    msRemaining: isOpen ? Math.max(0, endMs - now) : 0,
    msUntilOpen,
    weekKey: weekKeyFromStart(activeStart),
    weekLabel: weekLabelFromStart(activeStart),
    fridayISO: new Date(activeStart).toISOString(),
  };
}

/** يصوغ ملي ثانية إلى نص عدّاد عربي: "8 ساعات و15 دقيقة". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "انتهى الوقت";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "يوم" : "أيام"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "ساعة" : "ساعات"}`);
  // نُظهر الدقائق دائماً ما لم تكن هناك أيام كثيرة
  if (days === 0) parts.push(`${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`);

  return parts.join(" و");
}

/** يصوغ ms إلى أجزاء رقمية للعرض (HH:MM:SS-style). */
export function countdownParts(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function clampInt(v: any, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
