/**
 * مزوّد تاريخ المركبة الأوروبي - autoDNA / carVertical.
 *
 * نستخدم autoDNA كأساسي و carVertical كـ fallback.
 *
 * الإنتاج:
 *   AUTODNA_API_KEY     - https://www.autodna.com/api
 *   CARVERTICAL_API_KEY - https://www.carvertical.com/api
 */

import type { HistoryProvider, HistoryProviderResult } from "./types";
import { selectMockOutcome } from "./mock-fixtures";

export class EuropeProvider implements HistoryProvider {
  readonly name = "AUTODNA" as const;

  isEnabled(): boolean {
    return (
      !!process.env.AUTODNA_API_KEY ||
      !!process.env.CARVERTICAL_API_KEY ||
      process.env.VEHICLE_REPORT_DEMO === "true"
    );
  }

  async fetchHistory(vin: string): Promise<HistoryProviderResult> {
    if (process.env.AUTODNA_API_KEY) {
      // TODO: إنتاج
      return {
        provider: "AUTODNA",
        found: false,
        data: null,
        error: "AUTODNA_API_KEY مضبوط لكن التكامل لم يُفعَّل بعد.",
      };
    }

    if (process.env.CARVERTICAL_API_KEY) {
      // TODO: إنتاج
      return {
        provider: "CARVERTICAL",
        found: false,
        data: null,
        error: "CARVERTICAL_API_KEY مضبوط لكن التكامل لم يُفعَّل بعد.",
      };
    }

    const outcome = selectMockOutcome(vin, "EU");
    return {
      provider: "AUTODNA",
      found: outcome.found,
      data: outcome.data,
    };
  }
}
