/**
 * مزوّد تاريخ المركبة الكوري - Encar.
 *
 * Encar هو أكبر سوق سيارات مستعملة في كوريا الجنوبية ويوفّر تقارير حوادث رسمية.
 *
 * الإنتاج: ENCAR_API_KEY
 *   ملاحظة: Encar API ليس public بشكل واسع - قد تحتاج شراكة تجارية.
 *   كبدائل: KCID (الجمعية الكورية لبيانات السيارات) أو AJ Cell.
 */

import type { HistoryProvider, HistoryProviderResult } from "./types";
import { selectMockOutcome } from "./mock-fixtures";

export class EncarProvider implements HistoryProvider {
  readonly name = "ENCAR" as const;

  isEnabled(): boolean {
    return !!process.env.ENCAR_API_KEY || process.env.VEHICLE_REPORT_DEMO === "true";
  }

  async fetchHistory(vin: string): Promise<HistoryProviderResult> {
    if (process.env.ENCAR_API_KEY) {
      // TODO: إنتاج
      return {
        provider: "ENCAR",
        found: false,
        data: null,
        error: "ENCAR_API_KEY مضبوط لكن التكامل لم يُفعَّل بعد.",
      };
    }

    const outcome = selectMockOutcome(vin, "KR");
    return {
      provider: "ENCAR",
      found: outcome.found,
      data: outcome.data,
    };
  }
}
