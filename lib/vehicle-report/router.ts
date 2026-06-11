/**
 * Provider Router
 *
 * يختار المزوّد المناسب لتاريخ المركبة بناءً على:
 * 1. السوق الجغرافي (من VIN WMI أو من plantCountry)
 * 2. هل المزوّد مفعَّل (له API key)
 *
 * إذا لم يوجد مزوّد مفعَّل للسوق، يُرجع null والـ API يُرجع DECODE_ONLY.
 */

import type { VehicleMarket } from "./types";
import type { HistoryProvider } from "./providers/types";
import { CarfaxProvider } from "./providers/carfax";
import { CarfaxCaProvider } from "./providers/carfax-canada";
import { EuropeProvider } from "./providers/europe";
import { EncarProvider } from "./providers/encar";

/**
 * Singletons - الـ providers stateless فلا داعي لإنشائها مع كل طلب.
 */
const providers = {
  US: new CarfaxProvider(),
  CA: new CarfaxCaProvider(),
  EU: new EuropeProvider(),
  KR: new EncarProvider(),
} as const;

/**
 * يختار المزوّد المناسب للسوق.
 * يعيد null لو السوق غير مدعوم أو لو المزوّد غير مفعَّل.
 */
export function selectProvider(market: VehicleMarket): HistoryProvider | null {
  switch (market) {
    case "US": {
      const p = providers.US;
      return p.isEnabled() ? p : null;
    }
    case "CA": {
      const p = providers.CA;
      // إذا CARFAX Canada غير متاح، جرّب CARFAX الأمريكي (يدعم بعض السيارات الكندية)
      if (p.isEnabled()) return p;
      const us = providers.US;
      return us.isEnabled() ? us : null;
    }
    case "EU": {
      const p = providers.EU;
      return p.isEnabled() ? p : null;
    }
    case "KR": {
      const p = providers.KR;
      return p.isEnabled() ? p : null;
    }
    case "JP":
    case "OTHER":
    case "UNKNOWN":
    default:
      return null;
  }
}

/**
 * يعيد كل المزودات المفعَّلة (للتشخيص أو لعرض حالة الخدمة).
 */
export function getEnabledProviders(): HistoryProvider[] {
  return Object.values(providers).filter((p) => p.isEnabled());
}
