/**
 * مزوّد تاريخ المركبة الأمريكي - CARFAX.
 *
 * الإنتاج: يحتاج CARFAX_API_KEY في environment.
 * التطوير/Demo: لو المتغير غير موجود، يُستخدم mock.
 *
 * كيف تتصل بـ CARFAX الحقيقي:
 *   1. تسجيل في https://www.carfax.com/business/api
 *   2. اطلب VIN Decoder API access.
 *   3. ضع API key في .env.local:
 *      CARFAX_API_KEY=xxxxxxxx
 *   4. عدِّل fetchHistory() ليستدعي endpoint الحقيقي بدل الـ mock.
 */

import type { HistoryProvider, HistoryProviderResult } from "./types";
import { selectMockOutcome } from "./mock-fixtures";

export class CarfaxProvider implements HistoryProvider {
  readonly name = "CARFAX" as const;

  isEnabled(): boolean {
    // مفعّل لو في API key أو لو في وضع demo (لتجربة الواجهة)
    return !!process.env.CARFAX_API_KEY || process.env.VEHICLE_REPORT_DEMO === "true";
  }

  async fetchHistory(vin: string): Promise<HistoryProviderResult> {
    if (process.env.CARFAX_API_KEY) {
      // TODO: إنتاج - استدعاء API CARFAX الحقيقي
      // const res = await fetch(`https://api.carfax.com/v1/vehicle/${vin}`, {
      //   headers: { Authorization: `Bearer ${process.env.CARFAX_API_KEY}` }
      // });
      // ...
      // return { provider: "CARFAX", found: true, data: mapped };

      return {
        provider: "CARFAX",
        found: false,
        data: null,
        error: "CARFAX_API_KEY مضبوط لكن التكامل لم يُفعَّل بعد.",
      };
    }

    // وضع demo
    const outcome = selectMockOutcome(vin, "US");
    return {
      provider: "CARFAX",
      found: outcome.found,
      data: outcome.data,
    };
  }
}
