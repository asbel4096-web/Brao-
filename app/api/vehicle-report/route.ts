import { NextRequest, NextResponse } from "next/server";
import { detectMarketFromVin, normalizeVin, validateVin } from "@/lib/vin";
import { decodeVinFromNhtsa } from "@/lib/vehicle-report/decoder-nhtsa";
import { selectProvider } from "@/lib/vehicle-report/router";
import type { VehicleReportResponse } from "@/lib/vehicle-report/types";

/**
 * GET /api/vehicle-report?vin=XXXXX
 *
 * Pipeline:
 *   1. validate VIN
 *   2. decode من NHTSA (مجاني، أساسيات فقط)
 *   3. detect market من VIN WMI
 *   4. اختر provider مناسب للسوق (إن وُجد مفعَّل)
 *   5. fetch history من المزوّد
 *   6. ادمج النتائج في VehicleReportResponse
 *
 * النتائج المحتملة:
 *   - FULL_REPORT: decode + history
 *   - DECODE_ONLY: decode فقط (لا يوجد مزوّد للسوق أو لم يجد)
 *   - NOT_FOUND: حتى NHTSA لا يعرف الـ VIN
 *   - PROVIDER_ERROR: NHTSA فشل
 */

export const revalidate = 86400;

export async function GET(req: NextRequest) {
  const vinParam = req.nextUrl.searchParams.get("vin") || "";
  const vin = normalizeVin(vinParam);

  // 1. التحقق من VIN
  const validation = validateVin(vin);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.reason || "رقم الهيكل غير صالح." },
      { status: 400 }
    );
  }

  // 2. كشف السوق من WMI
  const market = detectMarketFromVin(vin);

  // 3. فك VIN من NHTSA
  let decoderResult;
  try {
    decoderResult = await decodeVinFromNhtsa(vin);
  } catch (err: any) {
    const response: VehicleReportResponse = {
      vin,
      status: "PROVIDER_ERROR",
      market,
      decoderSource: "NHTSA",
      errorMessage: err?.message || "تعذّر الوصول إلى خدمة فك VIN.",
    };
    return NextResponse.json(response, { status: 502 });
  }

  // 4. لو NHTSA لم يجد أي بيانات → NOT_FOUND
  if (!decoderResult.hasAnyData) {
    const response: VehicleReportResponse = {
      vin,
      status: "NOT_FOUND",
      market,
      decoderSource: "NHTSA",
      messages: ["رقم الهيكل غير معروف في قاعدة بيانات NHTSA. تأكد من صحة الرقم."],
    };
    return NextResponse.json(response, { status: 404 });
  }

  // 5. اختيار مزوّد التاريخ المناسب
  const provider = selectProvider(market);
  const messages: string[] = [];

  // 6. لا يوجد مزوّد مفعَّل لهذا السوق → DECODE_ONLY
  if (!provider) {
    messages.push(
      "تاريخ المركبة (الحوادث، الملاك، المسافة) غير متوفّر لهذا السوق حالياً. سيتم إضافته قريباً."
    );
    const response: VehicleReportResponse = {
      vin,
      status: "DECODE_ONLY",
      market,
      decoderSource: "NHTSA",
      decoded: decoderResult.data,
      messages,
    };
    return NextResponse.json(response, {
      status: 200,
      headers: cacheHeaders(),
    });
  }

  // 7. جلب التاريخ من المزوّد
  let historyResult;
  try {
    historyResult = await provider.fetchHistory(vin);
  } catch (err: any) {
    // المزوّد رمى exception - نرجع DECODE_ONLY مع رسالة
    messages.push(`تعذّر جلب تاريخ المركبة من ${provider.name}.`);
    const response: VehicleReportResponse = {
      vin,
      status: "DECODE_ONLY",
      market,
      decoderSource: "NHTSA",
      decoded: decoderResult.data,
      messages,
      errorMessage: err?.message,
    };
    return NextResponse.json(response, { status: 200, headers: cacheHeaders() });
  }

  // 8. المزوّد رد بأن VIN غير موجود لديه → DECODE_ONLY
  if (!historyResult.found || !historyResult.data) {
    messages.push(
      `لم يجد مزوّد التاريخ (${provider.name}) سجلاً لهذا الرقم.`
    );
    const response: VehicleReportResponse = {
      vin,
      status: "DECODE_ONLY",
      market,
      decoderSource: "NHTSA",
      decoded: decoderResult.data,
      messages,
    };
    return NextResponse.json(response, { status: 200, headers: cacheHeaders() });
  }

  // 9. التقرير الكامل
  // إن لم تتوفّر mileage من المزوّد، أضف رسالة صريحة (متطلب 6)
  if (
    historyResult.data.mileage === undefined ||
    historyResult.data.mileage === null
  ) {
    messages.push("المسافة المقطوعة غير متوفرة من المصدر.");
  }

  const response: VehicleReportResponse = {
    vin,
    status: "FULL_REPORT",
    market,
    decoderSource: "NHTSA",
    decoded: decoderResult.data,
    history: historyResult.data,
    historyProvider: historyResult.provider,
    messages: messages.length ? messages : undefined,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: cacheHeaders(),
  });
}

function cacheHeaders() {
  return {
    // كاش يومي على الـ CDN
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  };
}
