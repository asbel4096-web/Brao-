import { NextRequest, NextResponse } from "next/server";
import { normalizeVin, validateVin, VehicleReport, VehicleData } from "@/lib/vin";

/**
 * GET /api/vehicle-report?vin=XXXXX
 *
 * يستدعي NHTSA vPIC DecodeVinValues API ويعيد البيانات بشكل موحّد.
 *
 * NHTSA API:
 *   https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
 *
 * - مجاني، بدون مفتاح، بدون تسجيل.
 * - يرجع status 200 دائماً (حتى لو VIN غير معروف). نحلّل ErrorCode للتحقق.
 *
 * هذا الـ Route يعمل كـ proxy آمن:
 * - يخفي تفاصيل الـ vendor عن الواجهة (يسهّل تبديل المزوّد لاحقاً لـ CARFAX).
 * - يضيف caching على edge.
 * - يتحقق من VIN قبل إرسال الطلب.
 */

// ISR/edge cache — كل VIN يُكاش 24 ساعة لأن البيانات لا تتغيّر
export const revalidate = 86400;

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

interface NhtsaResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  Manufacturer?: string;
  VehicleType?: string;
  BodyClass?: string;
  Trim?: string;
  Series?: string;
  EngineModel?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  EngineHP?: string;
  FuelTypePrimary?: string;
  DriveType?: string;
  TransmissionStyle?: string;
  TransmissionSpeeds?: string;
  Doors?: string;
  Seats?: string;
  PlantCountry?: string;
  PlantCity?: string;
  PlantState?: string;
  Note?: string;
  ErrorCode?: string;
  ErrorText?: string;
  AdditionalErrorText?: string;
}

interface NhtsaResponse {
  Count: number;
  Message: string;
  Results: NhtsaResult[];
}

/**
 * يحوّل قيمة قد تكون "Not Applicable" أو فارغة إلى undefined.
 */
function clean(v?: string): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (/^not applicable$/i.test(trimmed)) return undefined;
  return trimmed;
}

function mapToVehicleData(r: NhtsaResult): VehicleData {
  return {
    make: clean(r.Make),
    model: clean(r.Model),
    modelYear: clean(r.ModelYear),
    manufacturer: clean(r.Manufacturer),
    vehicleType: clean(r.VehicleType),
    bodyClass: clean(r.BodyClass),
    trim: clean(r.Trim),
    series: clean(r.Series),
    engineModel: clean(r.EngineModel),
    engineCylinders: clean(r.EngineCylinders),
    engineDisplacementL: clean(r.DisplacementL),
    engineHP: clean(r.EngineHP),
    fuelType: clean(r.FuelTypePrimary),
    driveType: clean(r.DriveType),
    transmissionStyle: clean(r.TransmissionStyle),
    transmissionSpeeds: clean(r.TransmissionSpeeds),
    doors: clean(r.Doors),
    seats: clean(r.Seats),
    plantCountry: clean(r.PlantCountry),
    plantCity: clean(r.PlantCity),
    plantState: clean(r.PlantState),
    notes: clean(r.Note),
  };
}

export async function GET(req: NextRequest) {
  const vinParam = req.nextUrl.searchParams.get("vin") || "";
  const vin = normalizeVin(vinParam);

  // التحقق من VIN قبل أي طلب خارجي
  const validation = validateVin(vin);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.reason || "رقم الهيكل غير صالح." },
      { status: 400 }
    );
  }

  try {
    const url = `${NHTSA_BASE}/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url, {
      // كاش على مستوى Next/edge: نفس VIN لا يُسأل API مرتين خلال 24س
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `تعذّر الوصول إلى خدمة NHTSA (${res.status}).` },
        { status: 502 }
      );
    }

    const json = (await res.json()) as NhtsaResponse;
    if (!json.Results?.length) {
      return NextResponse.json(
        { error: "لم يتم العثور على بيانات لهذا الرقم." },
        { status: 404 }
      );
    }

    const result = json.Results[0];
    const data = mapToVehicleData(result);

    // ErrorCode = "0" يعني decoded clean. أي رمز آخر يعني وجود مشكلة جزئية.
    const errorCode = (result.ErrorCode || "").trim();
    const errorText = clean(result.ErrorText) || clean(result.AdditionalErrorText);

    // إذا لم يُرجع API أي بيانات أساسية، اعتبره غير موجود
    const hasAnyData = !!(data.make || data.model || data.modelYear || data.manufacturer);
    if (!hasAnyData) {
      return NextResponse.json(
        {
          error: "رقم الهيكل غير معروف في قاعدة بيانات NHTSA. تأكد من صحة الرقم.",
          vin,
        },
        { status: 404 }
      );
    }

    const report: VehicleReport = {
      vin,
      source: "NHTSA",
      data,
      decoded: errorCode === "0",
      errorText: errorCode !== "0" ? errorText : undefined,
    };

    return NextResponse.json(report, {
      status: 200,
      headers: {
        // Cache على CDN لمدة يوم
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
