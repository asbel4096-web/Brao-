/**
 * مزوّد تاريخ المركبة الكندي - CARFAX Canada (سابقاً CARPROOF).
 *
 * الإنتاج: يحتاج CARFAX_CA_API_KEY.
 * التطوير: mock.
 *
 * كيف تتصل بـ CARFAX Canada الحقيقي:
 *   1. https://www.carfax.ca/en/api
 *   2. اطلب business API key.
 *   3. ضع المفتاح في .env.local:
 *      CARFAX_CA_API_KEY=xxxxxxxx
 */

import type { HistoryProvider, HistoryProviderResult } from "./types";
import { selectMockOutcome } from "./mock-fixtures";

export class CarfaxCaProvider implements HistoryProvider {
  readonly name = "CARPROOF" as const;

  isEnabled(): boolean {
    return !!process.env.CARFAX_CA_API_KEY || process.env.VEHICLE_REPORT_DEMO === "true";
  }

  async fetchHistory(vin: string): Promise<HistoryProviderResult> {
    if (process.env.CARFAX_CA_API_KEY) {
      // TODO: إنتاج - استدعاء CARFAX Canada API
      return {
        provider: "CARPROOF",
        found: false,
        data: null,
        error: "CARFAX_CA_API_KEY مضبوط لكن التكامل لم يُفعَّل بعد.",
      };
    }

    const outcome = selectMockOutcome(vin, "CA");
    return {
      provider: "CARPROOF",
      found: outcome.found,
      data: outcome.data,
    };
  }
}
