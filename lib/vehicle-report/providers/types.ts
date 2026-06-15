/**
 * Interface مشترك لكل مزودات تاريخ المركبة.
 *
 * كل مزود يجب أن:
 * 1. يخبر إن كان مفعّلاً (له API key مثلاً).
 * 2. يخبر اسمه للتعريف.
 * 3. يحاول جلب التاريخ من API الخاص به.
 * 4. يعيد البيانات بـ shape موحَّد (VehicleHistoryData).
 *
 * هذا التجريد يسمح بإضافة مزودات جديدة دون تعديل API route أو الواجهة.
 */

import type { ReportProvider, VehicleHistoryData } from "../types";

export interface HistoryProviderResult {
  /** البيانات إن وُجدت */
  data: VehicleHistoryData | null;
  /** المزوّد الذي أنتج هذه البيانات */
  provider: ReportProvider;
  /** هل وُجد تقرير للـ VIN */
  found: boolean;
  /** خطأ من المزوّد (لو حصل) */
  error?: string;
}

export interface HistoryProvider {
  /** اسم المزوّد للعرض */
  readonly name: ReportProvider;

  /**
   * هل المزوّد مفعَّل (له API key أو في وضع mock).
   * بدون هذا، الـ router يتخطّاه.
   */
  isEnabled(): boolean;

  /**
   * يجلب تاريخ المركبة من API الخاص بالمزوّد.
   *
   * يجب ألا يرمي exceptions في الحالات العادية - يستخدم HistoryProviderResult.error بدلاً.
   * فقط الأخطاء الـ unrecoverable يمكن أن ترمى.
   */
  fetchHistory(vin: string): Promise<HistoryProviderResult>;
}
