/**
 * إعدادات SEO المركزية لـ Bratsho Car.
 *
 * BASE_URL: يُقرأ من NEXT_PUBLIC_SITE_URL، وإلا يستخدم نطاق الإنتاج.
 * عند ربط نطاق مخصّص لاحقاً، فقط غيّري متغيّر البيئة.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.bratshocar.com";

export const SITE_NAME = "براتشو كار";
export const SITE_NAME_EN = "Bratsho Car";

export const DEFAULT_DESCRIPTION =
  "براتشو كار - سوق السيارات الاحترافي في ليبيا: سيارات، حافلات، شاحنات، قطع غيار، كماليات وخدمات الورش. آلاف الإعلانات الموثوقة يومياً.";

/** الصورة الافتراضية للمشاركة (شعار/بانر). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** المدن الرئيسية لصفحات SEO. slug إنجليزي → اسم عربي. */
export const SEO_CITIES: { slug: string; ar: string; desc: string }[] = [
  {
    slug: "tripoli",
    ar: "طرابلس",
    desc: "تصفّح أحدث إعلانات السيارات المستعملة والجديدة في طرابلس. سيارات، شاحنات، حافلات وقطع غيار بأفضل الأسعار في العاصمة الليبية.",
  },
  {
    slug: "benghazi",
    ar: "بنغازي",
    desc: "أحدث عروض السيارات في بنغازي. اعثر على سيارتك المثالية من بين آلاف الإعلانات الموثوقة في شرق ليبيا.",
  },
  {
    slug: "misrata",
    ar: "مصراتة",
    desc: "سوق السيارات في مصراتة - سيارات مستعملة وجديدة، قطع غيار وخدمات بأسعار تنافسية.",
  },
  {
    slug: "sebha",
    ar: "سبها",
    desc: "إعلانات السيارات في سبها وجنوب ليبيا. تصفّح أحدث العروض وتواصل مع البائعين مباشرة.",
  },
  {
    slug: "zawiya",
    ar: "الزاوية",
    desc: "سيارات للبيع في الزاوية - أحدث الإعلانات الموثوقة من سيارات وشاحنات وقطع غيار.",
  },
];

export function citySlugToAr(slug: string): string | null {
  return SEO_CITIES.find((c) => c.slug === slug)?.ar || null;
}

export function cityArToSlug(ar: string): string | null {
  return SEO_CITIES.find((c) => c.ar === ar)?.slug || null;
}

/** يختصر نصاً لوصف meta (≤160 حرفاً). */
export function truncateDescription(text: string, max = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}
