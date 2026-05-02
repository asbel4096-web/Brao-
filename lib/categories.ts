export const libyaCities = [
  "طرابلس", "بنغازي", "مصراتة", "الزاوية", "زليتن", "سبها", "الخمس", "سرت",
  "البيضاء", "درنة", "طبرق", "أجدابيا", "غريان", "صبراتة", "صرمان", "ترهونة",
  "الجفارة", "بني وليد", "الكفرة", "نالوت", "يفرن", "غات", "أوباري", "مرزق",
  "هون", "ودان", "سوكنة", "المرج", "شحات", "القيقب", "رأس لانوف", "البريقة",
  "راس اجدير", "زوارة", "العجيلات", "جنزور", "تاجوراء", "عين زارة",
  "قصر بن غشير", "السواني", "ورشفانة", "مسلاتة", "سلوق", "توكرة", "قمينس",
  "القلعة", "الأصابعة", "الرياينة", "مزدة", "العربان", "الجميل", "رقدالين", "الماية",
];

export interface CategoryDef {
  slug: string;
  name: string;
  icon: string;
  group: "vehicles" | "parts" | "services" | "special";
}

export const categories: CategoryDef[] = [
  { slug: "cars", name: "سيارات", icon: "Car", group: "vehicles" },
  { slug: "buses", name: "حافلات", icon: "Bus", group: "vehicles" },
  { slug: "trucks", name: "شاحنات", icon: "Truck", group: "vehicles" },
  { slug: "car-parts", name: "قطع غيار سيارات", icon: "Cog", group: "parts" },
  { slug: "truck-parts", name: "قطع غيار شاحنات", icon: "Cog", group: "parts" },
  { slug: "electric-parts", name: "قطع غيار كهربائية", icon: "Zap", group: "parts" },
  { slug: "used-parts", name: "قطع غيار مستعملة", icon: "Recycle", group: "parts" },
  { slug: "accessories", name: "كماليات سيارات", icon: "Sparkles", group: "parts" },
  { slug: "oils", name: "زيوت ومواد مضافة", icon: "Droplet", group: "parts" },
  { slug: "tires", name: "إطارات وجنوط", icon: "CircleDot", group: "parts" },
  { slug: "mobile-mechanic", name: "ميكانيكي متنقل", icon: "Wrench", group: "services" },
  { slug: "bodywork", name: "سمكرة وزواق", icon: "PaintBucket", group: "services" },
  { slug: "workshops", name: "ورش ميكانيكا", icon: "Settings", group: "services" },
  { slug: "auto-electric", name: "فني كهربائي سيارات", icon: "Plug", group: "services" },
  { slug: "accident-cars", name: "سيارات بها حوادث", icon: "ShieldAlert", group: "special" },
  { slug: "vehicle-services", name: "خدمات وتقارير المركبات", icon: "FileText", group: "special" },
];

export const listingCategories: string[] = categories.map((c) => c.name);

export const findCategoryBySlug = (slug: string) =>
  categories.find((c) => c.slug === slug);

export const findCategoryByName = (name: string) =>
  categories.find((c) => c.name === name);

/**
 * يحوّل أي قيمة في URL (slug إنجليزي أو اسم عربي) إلى اسم القسم العربي
 * المخزَّن في Firestore. يُرجع نفس القيمة إذا لم يجد تطابق
 * (للحفاظ على التوافق مع الفلاتر اليدوية).
 */
export function resolveCategoryName(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  // محاولة كـ slug أولاً
  const bySlug = findCategoryBySlug(trimmed);
  if (bySlug) return bySlug.name;
  // محاولة كاسم عربي
  const byName = findCategoryByName(trimmed);
  if (byName) return byName.name;
  // fallback - رجّع كما هو
  return trimmed;
}

/**
 * عكسي: من الاسم العربي إلى الـ slug للاستخدام في URLs.
 */
export function resolveCategorySlug(name: string | null | undefined): string {
  if (!name) return "";
  const found = findCategoryByName(name.trim());
  return found?.slug || "";
}

export const marketplaceSections = [
  {
    title: "مركبات للبيع",
    accent: "from-brand-700 to-brand-500",
    items: categories.filter((c) => c.group === "vehicles"),
  },
  {
    title: "قطع غيار وكماليات",
    accent: "from-action-600 to-action-400",
    items: categories.filter((c) => c.group === "parts"),
  },
  {
    title: "ورش وخدمات الصيانة",
    accent: "from-slate-800 to-slate-500",
    items: categories.filter((c) => c.group === "services"),
  },
  {
    title: "خدمات خاصة",
    accent: "from-rose-600 to-pink-400",
    items: categories.filter((c) => c.group === "special"),
  },
];

export const fuelTypes = ["بنزين", "ديزل", "هايبرد", "كهرباء", "غاز"];
export const transmissionTypes = ["أوتوماتيك", "عادي", "نصف أوتوماتيك"];
