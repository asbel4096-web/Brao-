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
  | "motorcycles"
  | "bicycles"
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
  // ---------- حقول إضافية (مطابقة لـSchema التطبيق) ----------
  color: {
    key: "color",
    label: "اللون",
    type: "text",
    placeholder: "مثال: أبيض",
  } as FieldDef,
  cylinders: {
    key: "cylinders",
    label: "عدد الأسطوانات",
    type: "number",
  } as FieldDef,
  vin: {
    key: "vin",
    label: "رقم الهيكل (VIN)",
    type: "text",
    placeholder: "17 خانة",
  } as FieldDef,
  features: {
    key: "features",
    label: "المميزات",
    type: "chips",
    options: [
      "فتحة سقف",
      "كاميرا خلفية",
      "حساسات خلفية",
      "حساسات أمامية",
      "مرايا كهربائية",
      "نظام ملاحة",
      "مقاعد جلد",
      "مقاعد مدفّأة",
      "بلوتوث",
      "تشغيل بصمة",
      "شاشة لمس",
      "مثبت سرعة",
    ],
  } as FieldDef,
  address: {
    key: "address",
    label: "العنوان التفصيلي",
    type: "text",
    placeholder: "الشارع/المنطقة",
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
  F.color,
  F.cylinders,
  F.vin,
  F.features,
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

/* ---------- حقول الورش/الخدمات (services) ---------- */
const WORKSHOP_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم الورشة", type: "text", required: true },
  F.description,
  { key: "rating", label: "التقييم", type: "rating" },
  F.city,
  F.address,
  F.phone,
];

/* ---------- حقول المعارض (dealers/special) ---------- */
const DEALER_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم المعرض", type: "text", required: true },
  F.description,
  F.city,
  F.address,
  F.phone,
];

/* ---------- سيارات بها حوادث (special) ---------- */
const ACCIDENT_FIELDS: FieldDef[] = [
  F.title,
  F.brand,
  F.model,
  F.year,
  {
    key: "damageType",
    label: "نوع الضرر",
    type: "select",
    options: ["أمامي", "خلفي", "جانبي", "شامل", "غمر مياه", "حريق"],
  },
  {
    key: "repairable",
    label: "قابلة للإصلاح",
    type: "toggle",
  },
  F.color,
  F.vin,
  F.description,
  F.price,
  F.city,
  F.phone,
];

/* ===== قوالب الحقول الخاصة بكل قسم (Dynamic Forms) ===== */

/* حافلات: تضيف عدد المقاعد */
const BUS_FIELDS: FieldDef[] = [
  F.title,
  F.brand,
  F.model,
  F.year,
  { key: "seats", label: "عدد المقاعد", type: "number" },
  { key: "engine", label: "المحرك", type: "text", placeholder: "مثال: 2.5" },
  {
    key: "fuel",
    label: "نوع الوقود",
    type: "select",
    options: ["بنزين", "ديزل", "كهرباء", "هجين"],
  },
  { key: "mileage", label: "المسافة المقطوعة (كم)", type: "number" },
  F.color,
  F.features,
  F.condition,
  F.price,
  F.city,
  F.phone,
];

/* شاحنات: تضيف الحمولة */
const TRUCK_FIELDS: FieldDef[] = [
  F.title,
  F.brand,
  F.model,
  F.year,
  { key: "payload", label: "الحمولة (طن)", type: "number" },
  { key: "engine", label: "المحرك", type: "text", placeholder: "مثال: 3.0" },
  { key: "mileage", label: "المسافة المقطوعة (كم)", type: "number" },
  F.color,
  F.vin,
  F.condition,
  F.price,
  F.city,
  F.phone,
];

/* قطع غيار شاحنات: نوع الشاحنة + الموديلات */
const TRUCK_PARTS_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم القطعة", type: "text", required: true },
  { key: "truckType", label: "نوع الشاحنة", type: "text" },
  {
    key: "compatibleCar",
    label: "الموديلات المتوافقة",
    type: "text",
    placeholder: "مثال: مرسيدس أكتروس 2010-2018",
  },
  F.condition,
  F.price,
  F.city,
  F.phone,
];

/* قطع كهربائية: الفولت + الماركة */
const ELECTRIC_PARTS_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم القطعة", type: "text", required: true },
  { key: "voltage", label: "الفولت", type: "text", placeholder: "مثال: 12V" },
  F.brand,
  F.condition,
  F.price,
  F.city,
  F.phone,
];

/* قطع مستعملة: نسبة الاستخدام */
const USED_PARTS_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم القطعة", type: "text", required: true },
  F.brand,
  F.condition,
  {
    key: "usagePercent",
    label: "نسبة الاستخدام (%)",
    type: "number",
  },
  F.price,
  F.city,
  F.phone,
];

/* كماليات: اسم المنتج + الماركة + وصف */
const ACCESSORIES_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم المنتج", type: "text", required: true },
  F.brand,
  F.description,
  F.price,
  F.city,
  F.phone,
];

/* زيوت ومواد مضافة: السعة + النوع */
const OILS_FIELDS: FieldDef[] = [
  { key: "title", label: "الاسم", type: "text", required: true },
  { key: "oilBrand", label: "الشركة", type: "text" },
  { key: "capacity", label: "السعة", type: "text", placeholder: "مثال: 4 لتر" },
  {
    key: "oilType",
    label: "النوع",
    type: "text",
    placeholder: "مثال: 5W-30",
  },
  F.price,
  F.city,
  F.phone,
];

/* إطارات وجنوط: المقاس + العدد */
const TIRES_FIELDS: FieldDef[] = [
  { key: "title", label: "الاسم", type: "text", required: true },
  {
    key: "tireSize",
    label: "المقاس",
    type: "text",
    placeholder: "مثال: 215/60 R16",
  },
  F.brand,
  F.condition,
  { key: "tireCount", label: "العدد", type: "number" },
  F.price,
  F.city,
  F.phone,
];

/* ساحبة سيارات: نوع السطحة + خدمة 24 ساعة */
const TOW_DETAILED_FIELDS: FieldDef[] = [
  { key: "title", label: "اسم الخدمة", type: "text", required: true },
  {
    key: "towType",
    label: "نوع السطحة",
    type: "select",
    options: ["سطحة عادية", "سطحة هيدروليك", "ونش", "سحب ثقيل"],
  },
  F.coverageAreas,
  { key: "available24h", label: "خدمة 24 ساعة", type: "toggle" },
  F.availableNow,
  F.price,
  F.city,
  F.phone,
];

/* ---------- حقول الدراجات النارية (motorcycles) ---------- */
const MOTORCYCLE_FIELDS: FieldDef[] = [
  F.title,
  {
    key: "bikeType",
    label: "نوع الدراجة",
    type: "select",
    options: ["رياضية", "كروزر", "سكوتر", "أوف رود", "ATV"],
    required: true,
  },
  { key: "brand", label: "الماركة", type: "text", placeholder: "مثال: Honda / Yamaha" },
  F.year,
  { key: "engine", label: "سعة المحرك (cc)", type: "text", placeholder: "مثال: 250" },
  { key: "mileage", label: "المسافة المقطوعة (كم)", type: "number" },
  F.color,
  F.condition,
  F.price,
  F.city,
  F.phone,
];

/* ---------- حقول الدراجات الهوائية (bicycles) ---------- */
const BICYCLE_FIELDS: FieldDef[] = [
  F.title,
  {
    key: "bikeType",
    label: "نوع الدراجة",
    type: "select",
    options: ["جبلية", "سباق", "مدينة", "كهربائية"],
    required: true,
  },
  { key: "brand", label: "الماركة", type: "text", placeholder: "مثال: Giant / Trek" },
  { key: "frameSize", label: "مقاس الإطار", type: "text", placeholder: 'مثال: 26" أو L' },
  F.condition,
  F.price,
  F.city,
  F.phone,
];

const BY_SLUG: Record<string, Omit<CategoryFieldConfig, "slug">> = {
  // مركبات
  cars: { fields: VEHICLE_FIELDS, entityType: "listing", homeBucket: "cars" },
  motorcycles: {
    fields: MOTORCYCLE_FIELDS,
    entityType: "listing",
    homeBucket: "motorcycles",
  },
  bicycles: {
    fields: BICYCLE_FIELDS,
    entityType: "listing",
    homeBucket: "bicycles",
  },
  buses: { fields: BUS_FIELDS, entityType: "listing", homeBucket: "cars" },
  trucks: { fields: TRUCK_FIELDS, entityType: "listing", homeBucket: "cars" },
  "accident-cars": {
    fields: ACCIDENT_FIELDS,
    entityType: "listing",
    homeBucket: "special",
  },

  // قطع غيار + كماليات + زيوت + إطارات
  "car-parts": { fields: PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "truck-parts": { fields: TRUCK_PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "electric-parts": { fields: ELECTRIC_PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  "used-parts": { fields: USED_PARTS_FIELDS, entityType: "listing", homeBucket: "parts" },
  accessories: { fields: ACCESSORIES_FIELDS, entityType: "listing", homeBucket: "parts" },
  oils: { fields: OILS_FIELDS, entityType: "listing", homeBucket: "parts" },
  tires: { fields: TIRES_FIELDS, entityType: "listing", homeBucket: "parts" },

  // خدمات
  "tow-truck": { fields: TOW_DETAILED_FIELDS, entityType: "service", homeBucket: "tow" },
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
