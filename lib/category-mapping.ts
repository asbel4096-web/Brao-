import { categories } from "@/lib/categories";
import { getCategoryConfig, type HomeBucket } from "@/lib/category-config";

/**
 * ============================================================
 *  Auto Category Mapping (المرحلة 1)
 * ============================================================
 *
 * يربط فئة الإعلان (المخزَّنة في Firestore كاسم عربي) بـ"دلو" العرض
 * في الصفحة الرئيسية، حتى تظهر الإعلانات تلقائياً في قسمها الصحيح:
 *
 *   سيارات/حافلات/شاحنات     → cars     → "أحدث السيارات"
 *   * قطع غيار / كماليات / زيوت / إطارات → parts → "أحدث قطع الغيار"
 *   ساحبة سيارات             → tow      → "أحدث السطحات"
 *   ميكانيكي/سمكرة/ورش/كهرباء → services → "أحدث خدمات الصيانة"
 *   معارض/خدمات              → special  → أقسام خاصة
 *
 * يعتمد على getCategoryConfig (مصدر الحقيقة الواحد) فلا تكرار.
 */

export interface HomeBucketDef {
  bucket: HomeBucket;
  /** عنوان القسم في الرئيسية. */
  title: string;
  /** أسماء الفئات العربية (كما تُخزَّن في Firestore) ضمن هذا الدلو. */
  categoryNames: string[];
}

/** يُرجع دلو العرض لاسم فئة عربي (كما يأتي من Firestore). */
export function bucketForCategoryName(categoryName: string): HomeBucket {
  return getCategoryConfig(categoryName).homeBucket;
}

/** يُرجع دلو العرض لـslug. */
export function bucketForSlug(slug: string): HomeBucket {
  return getCategoryConfig(slug).homeBucket;
}

/**
 * يبني تعريفات أقسام الرئيسية المنفصلة ديناميكياً من categories،
 * فأي قسم جديد يُضاف مستقبلاً يُصنَّف تلقائياً (لا تعديل يدوي).
 */
export function getHomeBuckets(): HomeBucketDef[] {
  const titles: Record<HomeBucket, string> = {
    cars: "أحدث السيارات",
    parts: "أحدث قطع الغيار",
    services: "أحدث خدمات الصيانة",
    tow: "أحدث السطحات",
    dealers: "أحدث المعارض",
    special: "إعلانات أخرى",
  };

  const map = new Map<HomeBucket, string[]>();
  for (const cat of categories) {
    const b = getCategoryConfig(cat.slug).homeBucket;
    const arr = map.get(b) ?? [];
    arr.push(cat.name);
    map.set(b, arr);
  }

  // ترتيب ثابت للعرض
  const order: HomeBucket[] = [
    "cars",
    "parts",
    "services",
    "tow",
    "dealers",
    "special",
  ];

  return order
    .filter((b) => map.has(b))
    .map((b) => ({
      bucket: b,
      title: titles[b],
      categoryNames: map.get(b) ?? [],
    }));
}

/** أسماء الفئات العربية لدلو معيّن (لاستعلام Firestore: where category in [...]). */
export function categoryNamesForBucket(bucket: HomeBucket): string[] {
  return categories
    .filter((c) => getCategoryConfig(c.slug).homeBucket === bucket)
    .map((c) => c.name);
}
