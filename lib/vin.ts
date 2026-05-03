/**
 * مكتبة التحقق من رقم الهيكل (VIN) وأنواع تقرير المركبة.
 *
 * VIN صحيح:
 * - بطول 17 خانة بالضبط
 * - لا يحتوي على I, O, Q (لتفادي الالتباس مع 1, 0)
 * - يحتوي فقط على حروف وأرقام
 *
 * ملاحظة: لا نتحقق من check digit (الموضع 9) لأن VINs الأوروبية والآسيوية
 * لا تتبع نفس قاعدة check digit الأمريكية، وقد يرفض المستخدمين الليبيين خطأً.
 */

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidationResult {
  valid: boolean;
  /** سبب الرفض إن وجد */
  reason?: string;
}

export function validateVin(input: string): VinValidationResult {
  const vin = (input || "").trim().toUpperCase();
  if (!vin) {
    return { valid: false, reason: "أدخل رقم الهيكل (VIN)." };
  }
  if (vin.length !== 17) {
    return {
      valid: false,
      reason: `رقم الهيكل يجب أن يكون 17 خانة بالضبط (الحالي: ${vin.length}).`,
    };
  }
  if (/[IOQ]/i.test(vin)) {
    return {
      valid: false,
      reason: "رقم الهيكل لا يحتوي على الحروف I أو O أو Q. تأكّد من القراءة.",
    };
  }
  if (!VIN_REGEX.test(vin)) {
    return {
      valid: false,
      reason: "رقم الهيكل يحتوي على رموز غير مسموحة. استخدم حروف وأرقام إنجليزية فقط.",
    };
  }
  return { valid: true };
}

/**
 * ينظّف VIN للاستخدام في API: uppercase + إزالة المسافات.
 */
export function normalizeVin(input: string): string {
  return (input || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * شكل الرد الموحَّد من /api/vehicle-report
 */
export interface VehicleReport {
  /** الـ VIN الذي بُحث عنه */
  vin: string;
  /** مصدر البيانات (للعرض وللمستقبل لإضافة CARFAX) */
  source: "NHTSA" | "CARFAX" | "AUTOCHECK";
  /** البيانات نفسها (قد تكون حقول فارغة لو NHTSA لا يعرف) */
  data: VehicleData;
  /** هل رمز الخطأ من NHTSA يدلّ على decode ناجح */
  decoded: boolean;
  /** نص خطأ من NHTSA إن وُجد */
  errorText?: string;
}

export interface VehicleData {
  make?: string;            // الشركة المصنعة
  model?: string;           // الموديل
  modelYear?: string;       // سنة الصنع
  manufacturer?: string;    // المُصنِّع الكامل
  vehicleType?: string;     // نوع المركبة
  bodyClass?: string;       // فئة الهيكل
  trim?: string;            // الفئة (تريم)
  series?: string;          // السلسلة
  // المحرك
  engineModel?: string;
  engineCylinders?: string;
  engineDisplacementL?: string; // سعة المحرك
  engineHP?: string;
  fuelType?: string;
  // الدفع/الناقل
  driveType?: string;       // نظام الدفع (FWD/RWD/AWD/4WD)
  transmissionStyle?: string;
  transmissionSpeeds?: string;
  // أبعاد ومواصفات
  doors?: string;
  seats?: string;
  // التصنيع
  plantCountry?: string;
  plantCity?: string;
  plantState?: string;
  // معلومات إضافية
  notes?: string;
}
