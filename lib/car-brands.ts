/**
 * قائمة ماركات السيارات في Bratsho Car.
 *
 * ملاحظات مهمة:
 * - الحقل المخزَّن في Firestore لكل إعلان يبقى `brand` (وليس `make`)
 *   حفاظاً على بيانات الإعلانات الموجودة.
 * - نخزّن `id` (بالإنجليزي lowercase) كقيمة معيارية للتطابق في الفلاتر،
 *   ونعرض `nameAr` للمستخدم.
 * - `aliases` يدعم البحث بالعربي والإنجليزي وتهجئات بديلة.
 * - `logoUrl` اختياري؛ عند غيابه يُستخدم fallback احترافي (المكوّن BrandLogo).
 *
 * ابدأ بالـ 8 ماركات الأكثر شيوعاً في السوق الليبي، والقائمة قابلة
 * للتوسعة بإضافة عناصر جديدة فقط في المصفوفة أدناه.
 */

export interface CarBrand {
  /** معرّف معياري (lowercase ascii). يُخزَّن في Listing.brand. */
  id: string;
  /** الاسم بالإنجليزية كما يكتبه الجمهور. */
  nameEn: string;
  /** الاسم بالعربية - يُعرض في الواجهة. */
  nameAr: string;
  /** مرادفات للبحث (عربي + إنجليزي + تهجئات بديلة). */
  aliases: string[];
  /**
   * رابط الشعار (اختياري). يمكن أن يكون:
   * - رابط Firebase Storage HTTPS.
   * - أو مسار محلي في public/، مثل: /brand-logos/toyota.png
   * عند غيابه، يُرسم fallback أنيق (دائرة + حرف + اسم بالعربية).
   */
  logoUrl?: string;
}

export const CAR_BRANDS: CarBrand[] = [
  {
    id: "toyota",
    nameEn: "Toyota",
    nameAr: "تويوتا",
    aliases: ["toyota", "تويوتا"],
  },
  {
    id: "hyundai",
    nameEn: "Hyundai",
    nameAr: "هونداي",
    aliases: ["hyundai", "هونداي", "هيونداي", "هيوندي"],
  },
  {
    id: "kia",
    nameEn: "Kia",
    nameAr: "كيا",
    aliases: ["kia", "كيا"],
  },
  {
    id: "ford",
    nameEn: "Ford",
    nameAr: "فورد",
    aliases: ["ford", "فورد"],
  },
  {
    id: "mazda",
    nameEn: "Mazda",
    nameAr: "مازدا",
    aliases: ["mazda", "مازدا", "مزدا"],
  },
  {
    id: "samsung",
    nameEn: "Renault Samsung",
    nameAr: "سامسونج",
    aliases: ["samsung", "renault samsung", "سامسونج", "سامسونغ", "سامسنغ"],
  },
  {
    id: "chevrolet",
    nameEn: "Chevrolet",
    nameAr: "شفروليه",
    aliases: ["chevrolet", "chevy", "شفروليه", "شفر", "شيفروليه"],
  },
  {
    id: "daewoo",
    nameEn: "Daewoo",
    nameAr: "دايو",
    aliases: ["daewoo", "دايو", "دايوو"],
  },
];

/**
 * ابحث في الماركات. يدعم العربي والإنجليزي والمرادفات.
 * يعيد قائمة مرتّبة: المطابقة في البداية ثم المطابقة الجزئية.
 */
export function searchBrands(query: string): CarBrand[] {
  const q = query.trim().toLowerCase();
  if (!q) return CAR_BRANDS;

  const starts: CarBrand[] = [];
  const contains: CarBrand[] = [];

  for (const brand of CAR_BRANDS) {
    const haystack = [
      brand.id,
      brand.nameEn.toLowerCase(),
      brand.nameAr,
      ...brand.aliases.map((a) => a.toLowerCase()),
    ];
    let startsWith = false;
    let containsMatch = false;
    for (const term of haystack) {
      if (term.startsWith(q)) {
        startsWith = true;
        break;
      }
      if (term.includes(q)) containsMatch = true;
    }
    if (startsWith) starts.push(brand);
    else if (containsMatch) contains.push(brand);
  }

  return [...starts, ...contains];
}

/** ابحث عن ماركة بمعرّفها. آمن مع القيم الفارغة/الخاطئة. */
export function getBrandById(id?: string | null): CarBrand | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return CAR_BRANDS.find((b) => b.id === normalized);
}

/**
 * حاول استنتاج معرّف ماركة من قيمة `brand` المخزّنة في إعلان قديم.
 * يفيد عند البحث في إعلانات لم تستخدم الـid المعياري بعد.
 *
 * مثال: "Toyota" أو "تويوتا" أو "TOYOTA" → "toyota".
 * يعيد undefined لو لم تطابق أي ماركة.
 */
export function inferBrandId(rawBrand?: string | null): string | undefined {
  if (!rawBrand) return undefined;
  const value = rawBrand.trim().toLowerCase();
  if (!value) return undefined;
  for (const brand of CAR_BRANDS) {
    if (brand.id === value) return brand.id;
    if (brand.nameEn.toLowerCase() === value) return brand.id;
    if (brand.nameAr === rawBrand.trim()) return brand.id;
    if (brand.aliases.some((a) => a.toLowerCase() === value)) return brand.id;
  }
  return undefined;
}
