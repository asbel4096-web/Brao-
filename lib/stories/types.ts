import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * أنواع القصص المدعومة.
 * إضافة نوع جديد لاحقاً (مثل "ورشة") لا تحتاج إلا توسيع هذا الـ union
 * + توسيع الـ payload + إضافة fields component جديد.
 */
export type StoryType = "car" | "service" | "offer";

/* ============================================================
 * Payloads حسب النوع
 * ============================================================ */

/** قصة سيارة */
export interface CarStoryPayload {
  type: "car";
  title: string;          // عنوان قصير
  price?: number;         // اختياري
  city: string;
  listingId?: string;     // رابط لإعلان داخلي
  phone?: string;         // اتصال
  whatsapp?: string;      // واتساب
}

/** قصة خدمة */
export interface ServiceStoryPayload {
  type: "service";
  serviceName: string;    // اسم الخدمة
  description: string;    // وصف قصير
  city: string;
  phone: string;          // إجباري للخدمة
  whatsapp?: string;
}

/** قصة عرض / تخفيض */
export interface OfferStoryPayload {
  type: "offer";
  title: string;
  /**
   * مرونة: قد يكون نسبة (50% خصم) أو سعر (200 د.ل بدلاً من 400)
   * نخزّنه كـ string لمرونة العرض.
   */
  discount: string;
  city: string;
  phone?: string;
  whatsapp?: string;
}

/** الـ payload الموحَّد */
export type StoryPayload =
  | CarStoryPayload
  | ServiceStoryPayload
  | OfferStoryPayload;

/* ============================================================
 * مستند القصة في Firestore
 * ============================================================ */

/**
 * شكل المستند في collection 'stories'.
 *
 * createdAt و expiresAt قد تكون Timestamp (عند القراءة) أو
 * FieldValue (عند الكتابة بـ serverTimestamp). الـ helpers تطبيع ذلك.
 */
export interface Story {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  type: StoryType;
  imageUrl: string;
  payload: StoryPayload;
  createdAt: Timestamp | FieldValue;
  /** بعد 24 ساعة من createdAt */
  expiresAt: Timestamp | FieldValue;
  /** عدد المشاهدات الكلي - يقرؤه المالك فقط */
  viewsCount?: number;
}

/* ============================================================
 * عرض القصة في الواجهة (بعد parsing الـ timestamps)
 * ============================================================ */

export interface StoryDisplayItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  type: StoryType;
  imageUrl: string;
  payload: StoryPayload;
  /** ms epoch */
  createdAtMs: number;
  /** ms epoch */
  expiresAtMs: number;
  viewsCount?: number;
}

/* ============================================================
 * helpers للنوع: كل نوع → label عربي + لون
 * ============================================================ */

export const STORY_TYPE_META: Record<
  StoryType,
  {
    label: string;
    description: string;
    /** ألوان tailwind classes للأيقونة في picker */
    bgClass: string;
    iconClass: string;
  }
> = {
  car: {
    label: "سيارة",
    description: "اعرض سيارتك بشكل سريع لجمهور واسع",
    bgClass: "bg-gradient-to-br from-brand-700 to-brand-500",
    iconClass: "text-white",
  },
  service: {
    label: "خدمة",
    description: "روّج لخدمتك أو ورشتك",
    bgClass: "bg-gradient-to-br from-emerald-600 to-emerald-400",
    iconClass: "text-white",
  },
  offer: {
    label: "عرض / تخفيض",
    description: "أعلن عن عرض محدود الوقت",
    bgClass: "bg-gradient-to-br from-action-600 to-action-400",
    iconClass: "text-white",
  },
};
