import type { Timestamp } from "firebase/firestore";

/**
 * أنواع وثوابت CMS.
 *
 * الفلسفة:
 *  - صفحات CMS مكتوبة بـMarkdown (نص بسيط مع تنسيق خفيف)
 *  - تُخزَّن في cmsPages/{slug}
 *  - الـslug هو الـid (لا collision)
 *  - الصفحات المعروفة (privacy, terms, faq, ...) لها templates افتراضية
 *  - أي slug آخر يفتح في /p/[slug]
 */

export interface CmsPage {
  /** id = slug (privacy, terms, faq, about, ...) */
  id: string;
  slug: string;
  title: string;
  /** نص Markdown - سيُعرض في الموقع العام كـHTML آمن. */
  contentMarkdown: string;
  /** للظهور: true = منشورة، false = مسوّدة (لا تظهر للزوار). */
  published: boolean;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

/**
 * الصفحات المعروفة (preset). الأدمن يستطيع إنشاء صفحات إضافية بأي slug.
 * هذه القائمة فقط لمساعدة UI الإنشاء (suggestions).
 */
export const KNOWN_PAGE_SLUGS = [
  {
    slug: "privacy",
    title: "سياسة الخصوصية",
    description: "كيف نتعامل مع بيانات المستخدمين",
  },
  {
    slug: "terms",
    title: "اتفاقية الاستخدام",
    description: "شروط استخدام المنصة",
  },
  {
    slug: "faq",
    title: "الأسئلة الشائعة",
    description: "إجابات عن الأسئلة المتكررة",
  },
  {
    slug: "support",
    title: "الدعم والتواصل",
    description: "كيف تتواصل معنا",
  },
  {
    slug: "about",
    title: "عن براتشو كار",
    description: "معلومات عن المنصة",
  },
] as const;

// ============================================================
// Homepage config
// ============================================================

/**
 * Banner واحد في الصفحة الرئيسية.
 */
export interface HomepageBanner {
  id: string;
  imageUrl: string;
  /** صورة مخصّصة للجوال (اختياري - تُستخدم على الشاشات الصغيرة). */
  mobileImageUrl?: string;
  /** رابط عند الضغط (داخلي مثل /listings أو خارجي). null = ممسوح. */
  link?: string | null;
  title?: string | null;
  subtitle?: string | null;
  /** ترتيب العرض - الأصغر يظهر أولاً. */
  order: number;
  /** متاح للعرض؟ false = مخفي مؤقتاً دون حذف. */
  active: boolean;
  /** تاريخ بدء العرض (اختياري) - قبله لا يظهر البانر. */
  startDate?: Timestamp | null;
  /** تاريخ انتهاء العرض (اختياري) - بعده يُخفى البانر تلقائياً. */
  endDate?: Timestamp | null;
  createdAt?: Timestamp | null;
}

/**
 * Sections الصفحة الرئيسية وترتيبها.
 */
export const HOMEPAGE_SECTIONS = [
  { key: "banners", label: "البنرات" },
  { key: "featured", label: "إعلانات مميَّزة" },
  { key: "newest", label: "أحدث الإعلانات" },
  { key: "categories", label: "الأقسام" },
  { key: "tow", label: "ساحبات السيارات" },
  { key: "services", label: "خدمات وورش" },
] as const;

export type HomepageSection = (typeof HOMEPAGE_SECTIONS)[number]["key"];

/**
 * Document homepageConfig/main يحوي إعدادات الصفحة الرئيسية.
 */
export interface HomepageConfig {
  /** ترتيب الأقسام في الصفحة. */
  sectionsOrder: HomepageSection[];
  /** قائمة الأقسام المُفعَّلة (يمكن للأدمن إخفاء قسم). */
  enabledSections: HomepageSection[];
  /** قائمة id الإعلانات المختارة يدوياً للظهور في "مميَّزة" (بالترتيب). */
  featuredListings: string[];
  updatedBy?: string;
  updatedAt?: Timestamp | null;
}

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  sectionsOrder: ["banners", "featured", "newest", "categories", "tow", "services"],
  enabledSections: ["banners", "featured", "newest", "categories", "tow", "services"],
  featuredListings: [],
};
