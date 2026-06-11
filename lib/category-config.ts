import { categories, type CategoryDef } from "@/lib/categories";

/**
 * ============================================================
 *  نظام الأقسام الديناميكي — مصدر الحقيقة الواحد (المرحلة 1)
 * ============================================================
 *
 * يعرّف هذا الملف *الحقول الدقيقة* لكل قسم (سيارة لها حقولها،
 * قطع غيار لها حقولها، سطحة لها حقولها...).
 *
 * مبني فوق `categories` الموجودة في lib/categories.ts (لا يكرّرها):
 * كل قسم يُعرَّف بـslug، ونربط له قائمة حقول.
 *
 * لا يكسر النظام الحالي: `getAddListingConfig` يبقى كما هو؛ هذا الملف
 * طبقة جديدة تُستهلك تدريجياً (المراحل القادمة: Form ديناميكي، Card، إلخ).
 *
 * كل الحقول هنا أسماؤها تطابق حقول Listing الموجودة فعلاً في Firestore
 * (price, year, brand, model, fuel, transmission, mileage, engine, city,
 *  description, area, coverageAreas, availableNow...) حتى لا يتغيّر التخزين.
 */

/** أنواع حقول الإدخال المدعومة في النموذج الديناميكي. */
export type FieldType =
  | "text"
  | "number"
  | "price"
  | "textarea"
  | "select"
  | "city"
  | "brand"
  | "model"
  | "year"
  | "phone"
  | "toggle"
  | "rating"
  | "chips";

export interface FieldDef {
  /** المفتاح المخزَّن في Firestore (يطابق حقل Listing). */
  key: string;
  /** التسمية المعروضة للمستخدم. */
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  /** لخيارات select الثابتة. */
  options?: string[];
  /** تلميح صغير أسفل الحقل. */
  hint?: string;
}

/**
 * نوع الكيان المخزَّن (يطابق entityType الحالي في النظام):
 * - listing: إعلان عادي (سيارة، قطعة غيار...).
 * - service: خدمة (سطحة، ورشة، ميكانيكي...).
 */
export type EntityType = "listing" | "service";

/** التصنيف العالي للعرض في الرئيسية (يُستخدم في category-mapping). */
export type HomeBucket =
  | "cars"
  | "parts"
  | "services"
  | "tow"
  | "dealers"
  | "special";

export interface CategoryFieldConfig {
  slug: string;
  /** الحقول الدقيقة لهذا القسم بالترتيب. */
  fields: FieldDef[];
  entityType: EntityType;
  /** أين يظهر في الرئيسية (لأقسام "أحدث X" المنفصلة). */
  homeBucket: HomeBucket;
}

/* ---------- مجموعات حقول قابلة لإعادة الاستخدام ---------- */

const F = {
  price: {
    key: "price",
    label: "السعر",
    type: "price",
    required: true,
    placeholder: "أدخل السعر",
  } as FieldDef,
  city: {
    key: "city",
    label: "المدينة",
    type: "city",
    required: true,
  } as FieldDef,
  phone: {
    key: "phone",
    label: "رقم التواصل",
    type: "phone",
    required: true,
    placeholder: "091xxxxxxx",
  } as FieldDef,
  title: {
    key: "title",
    label: "عنوان الإعلان",
    type: "text",
    required: true,
    placeholder: "اكتب عنواناً واضحاً",
  } as FieldDef,
  description: {
    key: "description",
    label: "الوصف",
    type: "textarea",
    required: true,
    placeholder: "اكتب وصفاً تفصيلياً",
  } as FieldDef,
  brand: { key: "brand", label: "الماركة", type: "brand" } as FieldDef,
  model: { key: "model", label: "الموديل", type: "model" } as FieldDef,
  year: { key: "year", label: "سنة الصنع", type: "year" } as FieldDef,
  condition: {
    key: "condition",
    label: "الحالة",
    type: "select",
    options: ["جديد", "مستعمل"],
    required: true,
  } as FieldDef,
  availableNow: {
    key: "availableNow",
    label: "متاح الآن",
    type: "toggle",
  } as FieldDef,
  coverageAreas: {
    key: "coverageAreas",
    label: "مناطق التغطية",
    type: "text",
    placeholder: "المناطق التي تغطيها الخدمة",
  } as FieldDef,
};

/* ---------- حقول السيارات (vehicles) ---------- */
const VEHICLE_FIELDS: FieldDef[] = [
  F.title,
  F.brand,
  F.model,
  F.year,
  { key: "engine", label: "المحرك", type: "text", placeholder: "مثال: 1.6" },
  {
    key: "transmission",
    label: "ناقل الحركة",
    type: "select",
    options: ["أوتوماتيك", "عادي"],
  },
  {
    key: "fuel",
    label: "نوع الوقود",
    type: "select",
    options: ["بنزين", "ديزل", "كهرباء", "هجين"],
  },
  { key: "mileage", label: "المسافة المقطوعة (كم)", type: "number" },
  F.price,
  F.city,
  F.phone,
];

/* ---------- حقول قطع الغيار (parts) ---------- */
const PARTS_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم القطعة", type: "text", required: true },
  F.condition,
  {
    key: "compatibleCar",
    label: "السيارة المتوافقة",
    type: "text",
    placeholder: "مثال: تويوتا كامري 2015-2020",
  },
  F.price,
  F.city,
  F.phone,
];

/* ---------- حقول السطحة/السحب (tow) ---------- */
const TOW_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم الخدمة", type: "text", required: true },
  F.coverageAreas,
  F.availableNow,
  F.price,
  F.city,
  F.phone,
];

/* ---------- حقول الورش/الخدمات (services) ---------- */
const WORKSHOP_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم الورشة", type: "text", required: true },
  F.description,
  { key: "rating", label: "التقييم", type: "rating" },
  F.city,
  F.phone,
];

/* ---------- حقول المعارض (dealers/special) ---------- */
const DEALER_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم المعرض", type: "text", required: true },
  F.description,
  F.city,
  F.phone,
];

/* ---------- سيارات بها حوادث (special) ---------- */
const ACCIDENT_FIELDS: FieldDef[] = [
  F.title,
  F.brand,
  F.model,
  F.year,
  F.description,
  F.price,
  F.city,
  F.phone,
];

/**
 * خريطة slug → إعداد الحقول.
 * الأقسام غير المذكورة صراحةً تأخذ إعداداً افتراضياً حسب group (انظر الأسفل).
 */
const BY_SLUG: Record<string, Omit<CategoryFieldConfig, "slug">> = {
  // مركبات
  cars: { fields: VEHICLE_FIELDS, entityType: "listing", homeBucket: "cars" },
  buses: { fields: VEHICLE_FIELDS, entityType: "listing", homeBucket: "cars" },
  trucks: { fields: VEHICLE_FIELDS, entityType: "listing", homeBucket: "cars" },
  "accident-cars": {
    fields: ACCIDENT_FIELDS,
    entityType: "listing",
    homeBucket: "special",
  },

  // قطع غيار + كماليات + زيوت + إطارات
  "car-parts": { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "truck-parts": { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "electric-parts": { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "used-parts": { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  accessories: { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  oils: { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  tires: { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },

  // خدمات
  "tow-truck": { fields: TOW_FIELDS, entityType: "service", homeBucket: "tow" },
  "mobile-mechanic": {
    fields: WORKSHOP_FIELDS,
    entityType: "service",
    homeBucket: "services",
  },
  bodywork: { fields: WORKSHOP_FIELDS, entityType: "service", homeBucket: "services" },
  workshops: { fields: WORKSHOP_FIELDS, entityType: "service", homeBucket: "services" },
  "auto-electric": {
    fields: WORKSHOP_FIELDS,
    entityType: "service",
    homeBucket: "services",
  },

  // خاص
  "vehicle-services": {
    fields: DEALER_FIELDS,
    entityType: "listing",
    homeBucket: "special",
  },
};

/** إعداد افتراضي حسب group لأي قسم غير مذكور صراحةً. */
function defaultForGroup(group: CategoryDef["group"]): Omit<CategoryFieldConfig, "slug"> {
  switch (group) {
    case "vehicles":
      return { fields: VEHICLE_FIELDS, entityType: "listing", homeBucket: "cars" };
    case "parts":
      return { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" };
    case "services":
      return { fields: WORKSHOP_FIELDS, entityType: "service", homeBucket: "services" };
    default:
      return { fields: DEALER_FIELDS, entityType: "listing", homeBucket: "special" };
  }
}

/**
 * يُرجع إعداد الحقول الكامل لقسم ما (بالـslug أو الاسم العربي).
 * يضمن دائماً إرجاع إعداد صالح (افتراضي حسب group لو لم يُعرَّف صراحةً).
 */
export function getCategoryConfig(
  slugOrName: string
): CategoryFieldConfig {
  const cat =
    categories.find((c) => c.slug === slugOrName) ||
    categories.find((c) => c.name === slugOrName);

  if (!cat) {
    // قسم غير معروف → افتراضي آمن
    return { slug: slugOrName, ...defaultForGroup("special") };
  }

  const explicit = BY_SLUG[cat.slug];
  const cfg = explicit ?? defaultForGroup(cat.group);
  return { slug: cat.slug, ...cfg };
}

/** قائمة كل الإعدادات (مفيدة للتوليد التلقائي لأقسام الرئيسية). */
export function getAllCategoryConfigs(): CategoryFieldConfig[] {
  return categories.map((c) => ({
    slug: c.slug,
    ...(BY_SLUG[c.slug] ?? defaultForGroup(c.group)),
  }));
}
