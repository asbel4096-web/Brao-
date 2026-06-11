/**
 * مكتبة التحقق من VIN + كشف السوق من WMI (World Manufacturer Identifier).
 *
 * WMI = أول 3 أحرف من VIN. الحرف الأول يحدد المنطقة الجغرافية.
 * المرجع: ISO 3780.
 */

import type { VehicleMarket } from "./vehicle-report/types";

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidationResult {
  valid: boolean;
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

export function normalizeVin(input: string): string {
  return (input || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * يحدد السوق الجغرافي للمركبة من أول حرفين من VIN.
 *
 * VIN[0] = منطقة جغرافية:
 *   1, 4, 5     → الولايات المتحدة
 *   2           → كندا
 *   3           → المكسيك
 *   J           → اليابان
 *   K           → كوريا الجنوبية (KL=GM Korea, KM=Hyundai, KN=Kia, ...)
 *   L           → الصين
 *   S-Z         → أوروبا (W=ألمانيا، Z=إيطاليا، V=فرنسا/إسبانيا، ...)
 *   6, 7        → أوقيانوسيا
 *   8, 9        → أمريكا الجنوبية
 *
 * المرجع: ISO 3780 / SAE J853.
 */
export function detectMarketFromVin(vin: string): VehicleMarket {
  const v = normalizeVin(vin);
  if (v.length < 1) return "UNKNOWN";

  const first = v.charAt(0);

  // أمريكا
  if (first === "1" || first === "4" || first === "5") return "US";
  // كندا
  if (first === "2") return "CA";
  // كوريا الجنوبية
  if (first === "K") return "KR";
  // اليابان (نفصلها لأنه قد يكون لها مزود مختلف لاحقاً)
  if (first === "J") return "JP";
  // أوروبا (S-Z يغطي ألمانيا، إيطاليا، فرنسا، إسبانيا، السويد، بريطانيا، إلخ)
  if (first >= "S" && first <= "Z") return "EU";

  return "OTHER";
}

/**
 * اسم السوق بالعربية للعرض.
 */
export function marketLabel(market: VehicleMarket): string {
  switch (market) {
    case "US": return "الولايات المتحدة";
    case "CA": return "كندا";
    case "EU": return "أوروبا";
    case "KR": return "كوريا الجنوبية";
    case "JP": return "اليابان";
    case "OTHER": return "سوق آخر";
    case "UNKNOWN":
    default: return "غير محدد";
  }
}
