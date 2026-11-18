/**
 * Bratsho DS 1.0 — منطق عرض الإعلان المشترك بين كل البطاقات.
 * نفس القواعد تُنقل حرفياً إلى تطبيق Flutter (design_spec/BRATSHO_DS_SPEC.md §6.6):
 *  - عنوان بطاقة السيارة = الماركة + الموديل + السنة من الحقول المنظمة (قرار ق٢).
 *  - المواصفات من البيانات الموجودة فقط: سنة/مسافة/ناقل/وقود لكل المركبات
 *    (سيارات، حافلات، شاحنات، دراجات، سيارات حوادث، وإعلانات بلا قسم كما كانت تُعرض)،
 *    ولا تُعرض حقول السيارة على أقسام القطع والخدمات.
 *  - شارات الترويج بنفس منطق الإنتاج: شارة ترقية واحدة بالأولوية VIP > ممول > مميز > جديد،
 *    و«عاجل» شارة مستقلة معها. الألوان كما تعد الباقات المدفوعة: VIP ذهبي · ممول أخضر · مميز أزرق.
 */
import type { Listing } from "@/lib/types";
import { findCategoryByName, findCategoryBySlug } from "@/lib/categories";
import { formatNumber } from "@/lib/utils";

const CAR_CATEGORY = "سيارات";

export function isCarListing(l: Partial<Listing>): boolean {
  const cat = String(l.category || "").trim();
  return cat === CAR_CATEGORY || (l as any).categoryId === "cars";
}

/**
 * هل الإعلان مركبة (تُعرض له حقول السنة/المسافة/الناقل/الوقود إن وُجدت)؟
 * من سجل الأقسام في الموقع نفسه (lib/categories): مجموعة vehicles + «سيارات بها حوادث».
 * إعلان بلا قسم أو بقسم غير معروف يُعامل كما كان في الإنتاج (تُعرض حقوله إن وُجدت).
 */
export function isVehicleListing(l: Partial<Listing>): boolean {
  const a = l as any;
  const cat = String(l.category || "").trim();
  const def = (cat && findCategoryByName(cat)) || (a.categoryId && findCategoryBySlug(String(a.categoryId))) || null;
  if (!def) return true;
  return def.group === "vehicles" || def.slug === "accident-cars";
}

/** عنوان البطاقة. للسيارات من الحقول المنظمة (يُصلح عناوين مثل «للبيع» أو عنواناً لا يطابق السيارة). */
export function listingHeadline(l: Partial<Listing>): string {
  const title = String(l.title || "").trim();
  if (!isCarListing(l)) return title || "إعلان";
  const brand = String(l.brand || "").trim();
  const model = String(l.model || "").trim();
  if (!brand) return title || "إعلان";
  const parts = [brand];
  if (model && model !== brand) parts.push(model);
  const year = l.year ? String(l.year) : "";
  if (year && !parts.join(" ").includes(year)) parts.push(year);
  return parts.join(" ");
}

/** المسافة: الرقم منسّقاً، أو كما هي إن لم تكن رقماً صريحاً (لا نخمّن «70.000»). */
function mileageValue(v: unknown): { label: string; numeric: boolean } | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v > 0 ? { label: formatNumber(v), numeric: true } : null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s) > 0 ? { label: formatNumber(Number(s)), numeric: true } : null;
  return { label: s, numeric: false };
}

export type SpecIcon = "calendar" | "gauge" | "gear" | "fuel" | "check" | "pin" | "info" | "car" | "drop" | "star";
export interface SpecItem {
  key: string;
  /** القيمة؛ إن كانت رقمية تُعرض بخط Inter معزولة الاتجاه، والوحدة خارج العزل. */
  label: string;
  numeric?: boolean;
  unit?: string;
  icon: SpecIcon;
  tone?: "success";
}

/** صف المواصفات المختصر للبطاقة — حسب القسم، ومن البيانات الموجودة فقط. */
export function listingSpecs(l: Partial<Listing>, max = 3): SpecItem[] {
  const out: SpecItem[] = [];
  const a = l as any;
  if (isVehicleListing(l)) {
    if (l.year) out.push({ key: "year", label: String(l.year), numeric: true, icon: "calendar" });
    const km = mileageValue(l.mileage);
    if (km) out.push({ key: "mileage", label: km.label, numeric: km.numeric, unit: "كم", icon: "gauge" });
    if (l.transmission) out.push({ key: "transmission", label: String(l.transmission), icon: "gear" });
    if (l.fuel) out.push({ key: "fuel", label: String(l.fuel), icon: "fuel" });
    if (!out.length && a.condition) out.push({ key: "condition", label: String(a.condition), icon: "info" });
  } else {
    if (a.availableNow === true) out.push({ key: "available", label: "متاح الآن", icon: "check", tone: "success" });
    if (a.coverageAreas) out.push({ key: "coverage", label: String(a.coverageAreas), icon: "pin" });
    if (a.condition) out.push({ key: "condition", label: String(a.condition), icon: "info" });
    if (a.compatibleCar) out.push({ key: "compatible", label: String(a.compatibleCar), icon: "car" });
    if (a.oilType) out.push({ key: "oil", label: String(a.oilType), icon: "drop" });
    if (Number(a.rating) > 0) out.push({ key: "rating", label: Number(a.rating).toFixed(1), numeric: true, icon: "star" });
  }
  return out.slice(0, max);
}

export type PromoKind = "vip" | "urgent" | "featured" | "sponsored" | "new" | "cat";
export interface PromoBadge {
  kind: PromoKind;
  label: string;
}

/**
 * وقت انتهاء ترقية بالمللي ثانية. يقبل Timestamp من Firestore، وأيضاً الشكل
 * {seconds, nanoseconds} الذي يعود به الإعلان من كاش sessionStorage (JSON)،
 * وDate/رقم/نص تاريخ. يعيد NaN لقيمة موجودة لا يمكن قراءتها، و0 للفارغة.
 */
function untilMs(t: any): number {
  if (t === null || t === undefined || t === "") return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000 + Math.floor((Number(t.nanoseconds) || 0) / 1e6);
  if (typeof t._seconds === "number") return t._seconds * 1000;
  const ms = t instanceof Date ? t.getTime() : new Date(t).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * «مميز» حالياً — نفس قاعدة isListingFeatured (lib/utils) حرفياً: العلامة featured/isFeatured،
 * وبلا تاريخ انتهاء = مميز، وتاريخ غير مقروء = مميز. الفرق الوحيد أن تاريخ الكاش
 * {seconds} يُقرأ صحيحاً، فلا تظهر «مميز» على إعلان انتهى تمييزه.
 */
function featuredNow(a: any, now: number): boolean {
  if (!(a.featured === true || a.isFeatured === true)) return false;
  if (!a.featuredUntil) return true;
  const ms = untilMs(a.featuredUntil);
  if (!Number.isFinite(ms)) return true;
  return ms > now;
}

/** شارات الترويج على الصورة (حد أقصى شارتان)؛ اسم القسم (إن مُرِّر) يأخذ مكاناً شاغراً فقط. */
export function listingBadges(l: Partial<Listing>, max = 2, category?: string): PromoBadge[] {
  const now = Date.now();
  const a = l as any;
  const out: PromoBadge[] = [];
  // شارة الترقية الواحدة بأولوية الإنتاج: VIP > ممول > مميز > جديد
  if (untilMs(a.vipUntil) > now) out.push({ kind: "vip", label: "VIP" });
  else if (untilMs(a.boostedUntil) > now) out.push({ kind: "sponsored", label: "ممول" });
  else if (featuredNow(a, now)) out.push({ kind: "featured", label: "مميز" });
  else if (a.vehicleCondition === "جديدة") out.push({ kind: "new", label: "جديد" });
  // «عاجل» مستقلة — تظهر مع أي باقة ترقية أو بمفردها
  if (untilMs(a.urgentUntil) > now) out.push({ kind: "urgent", label: "عاجل" });
  if (category && out.length < max) out.push({ kind: "cat", label: category });
  return out.slice(0, max);
}

/** هل الإعلان VIP حالياً (لإطار البطاقة الذهبي كما في الإنتاج). */
export function isVipListing(l: Partial<Listing>): boolean {
  return untilMs((l as any).vipUntil) > Date.now();
}

export const BADGE_CLASS: Record<PromoKind, string> = {
  vip: "badge-vip",
  urgent: "badge-urgent",
  featured: "badge-featured",
  sponsored: "badge-sponsored",
  new: "badge-promo bg-white/95 text-slate-900 dark:bg-slate-800 dark:text-white",
  cat: "badge-cat",
};
