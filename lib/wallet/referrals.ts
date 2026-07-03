import type { Timestamp } from "firebase/firestore";

/**
 * Referrals System Types
 *
 * البنية:
 *   users/{uid}:
 *     - referralCode?: string         (الكود الخاص بالمستخدم — يدعو به الآخرين)
 *     - referredBy?: string           (كود من دعا هذا المستخدم — set عند التسجيل)
 *     - referredByUid?: string        (uid المُحيل — للسرعة في الـqueries)
 *     - referralsCount?: number       (عدد من قام بدعوتهم وأكملوا)
 *     - referralRewardEarned?: boolean (هل المستخدم قبض مكافأة على *كونه* مُحالاً؟)
 *     - referralActivatedAt?: Timestamp (متى فعّل المستخدم نظام الإحالات؟)
 *
 *   referrals/{referralId}:
 *     سجلّ كل عملية إحالة (لتتبع + admin dashboard).
 *     {referrerUid, referredUid, code, status, rewardedAt, listingId, createdAt}
 *
 * الـflow:
 *   1. مستخدم A يفعّل نظام الإحالات → كود يُنشأ
 *   2. A يشارك الرابط: bratsho.ly/?ref=BRAT-AHMED-X7K
 *   3. B يفتح الرابط → الكود يُحفظ في localStorage
 *   4. B يُسجّل → الكود يُطبَّق (referredBy = code) + يُنشأ referral doc بحالة "pending"
 *   5. B ينشر إعلاناً → الإعلان يُعتمد من الأدمن
 *   6. عند الاعتماد: claim API يُمنح A و B كلٌّ 10 د.ل + status = "completed"
 */

export const REFERRAL_REWARD_BC = 10;

/** سقف يومي للمكافآت من نفس مُحيل (لمنع abuse). */
export const MAX_REFERRALS_PER_DAY = 5;

/** أقصى فترة يبقى فيها الكود valid في localStorage (30 يوم). */
export const REFERRAL_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ReferralStatus =
  | "pending"     // B سجّل، لم يكمل بعد (لم ينشر إعلاناً معتمداً)
  | "completed"   // B أكمل، المكافآت صُرفت
  | "expired"     // فات الوقت، B لم يكمل
  | "blocked";    // أحد الطرفين محظور/مرفوض

export interface ReferralDoc {
  id: string;
  referrerUid: string;     // من دعا
  referrerEmail?: string;
  referredUid: string;     // من دُعي
  referredEmail?: string;
  code: string;            // الكود المستخدم
  status: ReferralStatus;
  rewardedAt?: Timestamp | null;
  /** الإعلان الذي أطلق المكافأة. */
  triggerListingId?: string | null;
  createdAt?: Timestamp | null;
}

/**
 * توليد كود إحالة فريد.
 * النمط: BRAT-{prefix}-{random4}
 *  - BRAT = ثابت (تمييز braTSHO)
 *  - prefix = اسم المستخدم (3-5 أحرف عربية أو إنجليزية، uppercase)
 *  - random4 = 4 أحرف عشوائية للفرادة
 *
 * أمثلة:
 *   AHMED → BRAT-AHMED-X7K2
 *   محمد  → BRAT-MOHAM-K9M4 (نُترجم/نأخذ awwal أحرف)
 *   فاضي  → BRAT-USER-A2X9
 */
const RANDOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون 0/O/I/1 لتجنّب الالتباس

export function generateReferralCode(displayName?: string): string {
  // نُحاول استخراج 3-5 أحرف من الاسم
  let prefix = "USER";
  if (displayName) {
    // إزالة المسافات + علامات الترقيم، ثم أخذ أول الأحرف اللاتينية
    const ascii = displayName
      .normalize("NFKD")
      .replace(/[^\w\u0621-\u064A]/g, "")
      .toUpperCase();
    // نُفضّل اللاتينية إن وُجدت، وإلا نأخذ من العربية
    const latinMatch = ascii.match(/[A-Z]+/);
    if (latinMatch && latinMatch[0].length >= 3) {
      prefix = latinMatch[0].slice(0, 5);
    } else if (ascii.length >= 3) {
      // نأخذ أول 5 (قد تكون عربية - الكود يبقى فريداً، فقط أقل قابلية للقراءة)
      prefix = "USER";
    }
  }

  let random = "";
  for (let i = 0; i < 4; i++) {
    random += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }

  return `BRAT-${prefix}-${random}`;
}

/** التحقق من شكل الكود (لتجنّب lookups فاسدة). */
export function isValidCodeFormat(code: string): boolean {
  return /^BRAT-[A-Z]{3,8}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase());
}

/** بناء رابط الدعوة الكامل. */
export function buildReferralLink(code: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://brao-chi.vercel.app");
  return `${base}/?ref=${code}`;
}

/** نص مشاركة WhatsApp. */
export function buildWhatsAppShareText(code: string, link: string): string {
  return encodeURIComponent(
    `🚗 تطبيق براتشو كار - أفضل منصة لبيع وشراء السيارات في ليبيا.\n\nسجّل عبر رابط الدعوة واحصل على ${REFERRAL_REWARD_BC} د.ل هدية عند نشر إعلانك الأول:\n${link}\n\nكود الدعوة: ${code}`
  );
}

/** صياغة عدد المُحالين. */
export function formatReferralsCount(count: number): string {
  if (count === 0) return "لا أحد بعد";
  if (count === 1) return "صديق واحد";
  if (count === 2) return "صديقان";
  if (count <= 10) return `${count} أصدقاء`;
  return `${count} صديقاً`;
}
