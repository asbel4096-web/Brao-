/**
 * Mock fixtures لكل سوق.
 *
 * تُستخدم عندما لا تكون API keys الحقيقية مضبوطة في .env.
 * تتيح اختبار الواجهة بكل الحالات (تقرير كامل، حقول جزئية، الخ).
 *
 * يُختار الـ mock بناءً على آخر رقمين من VIN لتغطية حالات مختلفة:
 * - "00" → not found
 * - "11" → بيانات جزئية (بدون mileage)
 * - أي شيء آخر → بيانات كاملة
 */

import type { VehicleHistoryData } from "../types";

export type MockKey = "US" | "CA" | "EU" | "KR";

interface MockOutcome {
  found: boolean;
  data: VehicleHistoryData | null;
}

/**
 * يحدّد نوع الـ mock بناءً على VIN.
 */
export function selectMockOutcome(vin: string, market: MockKey): MockOutcome {
  const last2 = vin.slice(-2);

  // VIN ينتهي بـ "00" → not found (لاختبار حالة NOT_FOUND)
  if (last2 === "00") {
    return { found: false, data: null };
  }

  // VIN ينتهي بـ "11" → بيانات بدون mileage (لاختبار "غير متوفر")
  if (last2 === "11") {
    return {
      found: true,
      data: buildPartialMock(market),
    };
  }

  // الافتراضي: تقرير كامل
  return {
    found: true,
    data: buildFullMock(market),
  };
}

function buildFullMock(market: MockKey): VehicleHistoryData {
  switch (market) {
    case "US":
      return {
        mileage: 78420,
        mileageUnit: "mi",
        mileageDate: "2024-08-15",
        accidentCount: 1,
        accidents: [
          {
            date: "2022-03-10",
            severity: "moderate",
            location: "Texas, USA",
            description: "اصطدام جانبي - تم الإصلاح بدائل أصلية.",
          },
        ],
        previousOwnersCount: 2,
        previousOwners: [
          { ownerNumber: 1, type: "personal", region: "California", startDate: "2019-05-01", endDate: "2022-04-01" },
          { ownerNumber: 2, type: "personal", region: "Texas", startDate: "2022-04-01" },
        ],
        titleStatus: "clean",
        importCountry: "United States",
        inspectionStatus: "passed",
        inspectionDate: "2024-09-01",
        notes: ["لا توجد بلاغات سرقة.", "صيانة منتظمة في وكيل معتمد."],
      };

    case "CA":
      return {
        mileage: 142500,
        mileageUnit: "km",
        mileageDate: "2024-11-20",
        accidentCount: 0,
        previousOwnersCount: 1,
        previousOwners: [
          { ownerNumber: 1, type: "personal", region: "Ontario", startDate: "2018-09-15" },
        ],
        titleStatus: "clean",
        importCountry: "Canada",
        inspectionStatus: "passed",
        inspectionDate: "2024-10-12",
        notes: ["مركبة كندية أصلية.", "الفحص السنوي تم في موعده."],
      };

    case "EU":
      return {
        mileage: 168900,
        mileageUnit: "km",
        mileageDate: "2024-12-01",
        accidentCount: 2,
        accidents: [
          {
            date: "2020-11-22",
            severity: "minor",
            location: "Hamburg, Germany",
            description: "خدوش سطحية في الباب الخلفي.",
          },
          {
            date: "2023-06-18",
            severity: "moderate",
            location: "Berlin, Germany",
            description: "اصطدام أمامي خفيف.",
          },
        ],
        previousOwnersCount: 3,
        previousOwners: [
          { ownerNumber: 1, type: "lease", region: "Germany", startDate: "2017-02-01", endDate: "2020-02-01" },
          { ownerNumber: 2, type: "personal", region: "Germany", startDate: "2020-02-15", endDate: "2023-07-01" },
          { ownerNumber: 3, type: "personal", region: "Poland", startDate: "2023-07-15" },
        ],
        titleStatus: "clean",
        importCountry: "Germany",
        inspectionStatus: "passed",
        inspectionDate: "2024-08-22",
        notes: ["شهادة TÜV سارية.", "صيانة موثّقة بالكامل."],
      };

    case "KR":
      return {
        mileage: 95300,
        mileageUnit: "km",
        mileageDate: "2024-10-05",
        accidentCount: 1,
        accidents: [
          {
            date: "2021-07-04",
            severity: "minor",
            location: "Seoul, South Korea",
            description: "اصطدام خلفي بسيط - مصد فقط.",
          },
        ],
        previousOwnersCount: 1,
        previousOwners: [
          { ownerNumber: 1, type: "personal", region: "Seoul", startDate: "2019-12-01" },
        ],
        titleStatus: "clean",
        importCountry: "South Korea",
        inspectionStatus: "passed",
        inspectionDate: "2024-07-30",
        notes: ["تقرير Encar متوفر.", "بدون تاريخ سيول مياه أو تايلاند."],
      };
  }
}

/**
 * mock بقيم جزئية - لاختبار "المسافة المقطوعة غير متوفرة من المصدر".
 */
function buildPartialMock(market: MockKey): VehicleHistoryData {
  switch (market) {
    case "US":
      return {
        // mileage مفقود عمداً
        accidentCount: 0,
        previousOwnersCount: 1,
        titleStatus: "clean",
        notes: ["المسافة المقطوعة لم تُحدَّث في القاعدة منذ آخر تسجيل."],
      };
    case "CA":
      return {
        accidentCount: 0,
        titleStatus: "clean",
        importCountry: "Canada",
      };
    case "EU":
      return {
        previousOwnersCount: 2,
        titleStatus: "clean",
        importCountry: "Germany",
      };
    case "KR":
      return {
        accidentCount: 0,
        titleStatus: "clean",
      };
  }
}
