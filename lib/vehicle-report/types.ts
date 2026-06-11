/**
 * أنواع TypeScript لميزة تقرير المركبة.
 *
 * الفلسفة: فصل decoded data (مجاني من NHTSA) عن history data (من مزود خارجي
 * إقليمي مدفوع غالباً) لأن:
 * - decoded data متوفّر دائماً تقريباً
 * - history data قد لا يتوفّر حسب السوق أو حسب وجود اشتراك مع المزود
 */

/**
 * البيانات الأساسية المفكوكة من VIN (من NHTSA).
 * كل الحقول optional لأن NHTSA أحياناً لا يعرف بعضها.
 */
export interface DecodedVehicleData {
  // الأساسيات
  make?: string;            // الشركة المصنعة (Toyota, Ford, ...)
  model?: string;           // الموديل (Camry, Mustang, ...)
  modelYear?: string;       // سنة الصنع
  manufacturer?: string;    // المُصنِّع الكامل
  vehicleType?: string;     // نوع المركبة (Passenger Car, ...)
  bodyClass?: string;       // فئة الهيكل (Sedan, SUV, ...)
  trim?: string;            // الفئة (تريم)
  series?: string;          // السلسلة

  // المحرك
  engineModel?: string;
  engineCylinders?: string;
  engineDisplacementL?: string;
  engineHP?: string;
  fuelType?: string;

  // الدفع/الناقل
  driveType?: string;
  transmissionStyle?: string;
  transmissionSpeeds?: string;

  // الأبعاد
  doors?: string;
  seats?: string;

  // مكان التصنيع (مهم لمعرفة السوق)
  plantCountry?: string;
  plantCity?: string;
  plantState?: string;
}

/**
 * بيانات تاريخ المركبة من مزود خارجي.
 * كل الحقول optional - يُعرض فقط الموجود فعلاً.
 *
 * ملاحظة مهمة: المسافة المقطوعة (mileage) موجودة هنا، وليست في DecodedVehicleData
 * لأن NHTSA لا يقدّمها.
 */
export interface VehicleHistoryData {
  /** المسافة المقطوعة بالكيلومتر */
  mileage?: number;
  /** وحدة المسافة الأصلية (للعرض) */
  mileageUnit?: "km" | "mi";
  /** تاريخ آخر قراءة للعدّاد (ISO date) */
  mileageDate?: string;

  /** عدد الحوادث المسجّلة */
  accidentCount?: number;
  /** ملخص الحوادث */
  accidents?: AccidentRecord[];

  /** عدد الملاك السابقين */
  previousOwnersCount?: number;
  /** بيانات الملاك (إن وُفِّرت) */
  previousOwners?: OwnershipRecord[];

  /** حالة العنوان (Title Status) */
  titleStatus?: TitleStatus;
  /** بلد الاستيراد الأصلي */
  importCountry?: string;
  /** نتيجة آخر فحص فني */
  inspectionStatus?: InspectionStatus;
  /** تاريخ آخر فحص فني (ISO date) */
  inspectionDate?: string;

  /** ملاحظات نصية حرّة من المزود */
  notes?: string[];
}

export interface AccidentRecord {
  date?: string;       // ISO
  severity?: "minor" | "moderate" | "severe" | "totaled";
  location?: string;
  description?: string;
}

export interface OwnershipRecord {
  ownerNumber: number;
  startDate?: string;
  endDate?: string;
  type?: "personal" | "lease" | "rental" | "fleet" | "dealer";
  region?: string;
}

export type TitleStatus =
  | "clean"
  | "salvage"
  | "rebuilt"
  | "flood"
  | "lemon"
  | "junk"
  | "unknown";

export type InspectionStatus = "passed" | "failed" | "expired" | "unknown";

/**
 * المنطقة/السوق المُحدَّدة من VIN.
 * مبني على أول حرف من VIN (WMI - World Manufacturer Identifier).
 */
export type VehicleMarket = "US" | "CA" | "EU" | "KR" | "JP" | "OTHER" | "UNKNOWN";

/**
 * مصدر بيانات التقرير (المزوّد).
 */
export type ReportProvider =
  | "NHTSA"      // NHTSA - مجاني، decoding فقط
  | "CARFAX"     // أمريكا
  | "AUTOCHECK"  // أمريكا
  | "CARPROOF"   // كندا (يُعرف الآن بـ CARFAX Canada)
  | "AUTODNA"    // أوروبا
  | "CARVERTICAL" // أوروبا
  | "ENCAR"      // كوريا
  | "NONE";      // لا يوجد مزود مفعّل لهذا السوق

/**
 * حالة التقرير الإجمالية - تحدد ما يُعرض في الواجهة.
 */
export type ReportStatus =
  /** التقرير كامل: decode + history */
  | "FULL_REPORT"
  /** decode متوفّر فقط، لا توجد بيانات history */
  | "DECODE_ONLY"
  /** VIN غير معروف حتى من NHTSA */
  | "NOT_FOUND"
  /** خطأ من المزود */
  | "PROVIDER_ERROR";

/**
 * الرد الموحَّد من /api/vehicle-report.
 *
 * هذا shape ثابت بصرف النظر عن المزود - يسهّل الواجهة.
 */
export interface VehicleReportResponse {
  vin: string;
  status: ReportStatus;
  market: VehicleMarket;

  /** البيانات المفكوكة (متوفّرة دائماً في FULL_REPORT و DECODE_ONLY) */
  decoded?: DecodedVehicleData;
  /** مصدر فك الـ VIN (دائماً NHTSA حالياً) */
  decoderSource: "NHTSA";

  /** بيانات التاريخ (فقط في FULL_REPORT) */
  history?: VehicleHistoryData;
  /** المزوّد الذي أعاد بيانات التاريخ */
  historyProvider?: ReportProvider;

  /**
   * رسائل للواجهة (لعرضها للمستخدم).
   * مثلاً: "المسافة المقطوعة غير متوفرة من المصدر"
   */
  messages?: string[];

  /** نص الخطأ الأصلي إن وُجد (لـ status PROVIDER_ERROR) */
  errorMessage?: string;
}
