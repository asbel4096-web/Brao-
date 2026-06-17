import type { Timestamp } from "firebase/firestore";

/**
 * Feature Flags System
 *
 * الفلسفة: نُريد القدرة على تشغيل/إيقاف ميزات كاملة بدون redeploy.
 * كل flag هو وثيقة في `featureFlags/{key}` يحوي `enabled: boolean`.
 *
 * الاستخدام:
 *  - في الـUI: `useFeatureFlag("wallet")` → boolean
 *  - في API: نفس المنطق server-side للحماية المزدوجة
 *  - في rules: نقرأ الـflag قبل السماح بعمليات حساسة
 *
 * عند `enabled=false`:
 *  - الـUI لا يعرض الميزة (الأزرار/الصفحات/...) - كأنها غير موجودة
 *  - الـAPI ترفض الكتابات (طبقة حماية ثانية)
 *  - الـrules ترفض writes (طبقة حماية ثالثة)
 *
 * هذا يعطينا 3 طبقات دفاع، يكفي إغلاق flag واحد لإيقاف ميزة بالكامل.
 */

export const FEATURE_FLAGS = {
  WALLET: "wallet",
  REFERRALS: "referrals",
  VIP: "vip",
  BOOSTS: "boosts",
  /** اشتراك توثيق المعارض (paid). flag منفصل عن wallet لأن مدفوعات
   *  التوثيق قد تكون أحياناً منفصلة (admin manually verifies). */
  VERIFICATION_PAID: "verification_paid",
  /** قصص المعارض (Stories) في الصفحة الرئيسية. */
  STORIES: "stories",
  /** خدمة الساحبات/السطحة. */
  TOW_SERVICE: "tow_service",
  /** التسجيل الجديد — عند الإيقاف يُمنع إنشاء حسابات جديدة. */
  REGISTRATION: "registration",
  /** بانرات الصفحة الرئيسية. */
  BANNERS: "banners",
  /** وضع الصيانة — عند التفعيل يُغلق التطبيق للزوّار (يبقى للأدمن). */
  MAINTENANCE: "maintenance",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const ALL_FEATURE_FLAGS: FeatureFlagKey[] = Object.values(FEATURE_FLAGS);

/** Metadata لكل flag للعرض في UI الإدارة. */
export const FLAG_METADATA: Record<
  FeatureFlagKey,
  {
    label: string;
    description: string;
    icon?: string;
    /** افتراضي عند عدم وجود الـdoc (للأمان: غالباً false). */
    defaultEnabled: boolean;
  }
> = {
  wallet: {
    label: "نظام المحفظة",
    description: "تفعيل المحفظة + الرصيد + المعاملات لكل المستخدمين",
    defaultEnabled: false,
  },
  referrals: {
    label: "نظام الإحالات",
    description: "روابط الدعوة + مكافآت 10 BC لكل طرف",
    defaultEnabled: false,
  },
  vip: {
    label: "حسابات VIP",
    description: "اشتراكات VIP الخاصة + ميزاتها",
    defaultEnabled: false,
  },
  boosts: {
    label: "تعزيز الإعلانات",
    description: "Boost سريع للإعلانات بـBC",
    defaultEnabled: false,
  },
  verification_paid: {
    label: "اشتراكات توثيق المعارض",
    description: "اشتراك شهري مدفوع للتوثيق (200 BC شهرياً)",
    defaultEnabled: false,
  },
  stories: {
    label: "قصص المعارض",
    description: "شريط القصص في أعلى الصفحة الرئيسية",
    defaultEnabled: true,
  },
  tow_service: {
    label: "خدمة الساحبات",
    description: "قسم وزر خدمة السطحة/الساحبات",
    defaultEnabled: true,
  },
  registration: {
    label: "التسجيل الجديد",
    description: "السماح بإنشاء حسابات جديدة (الإيقاف يمنع التسجيل الجديد فقط)",
    defaultEnabled: true,
  },
  banners: {
    label: "بانرات الصفحة الرئيسية",
    description: "عرض شريط البانرات الإعلانية في الواجهة",
    defaultEnabled: true,
  },
  maintenance: {
    label: "وضع الصيانة",
    description: "إغلاق التطبيق مؤقتاً للزوّار (يبقى متاحاً للأدمن فقط)",
    defaultEnabled: false,
  },
};

/** بنية وثيقة flag في Firestore. */
export interface FeatureFlagDoc {
  key: FeatureFlagKey;
  enabled: boolean;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedAt?: Timestamp | null;
  /** ملاحظات اختيارية من الأدمن (مثلاً "أُغلق مؤقتاً للصيانة"). */
  note?: string;
}
