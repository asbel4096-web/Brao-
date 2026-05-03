/**
 * NHTSA vPIC Decoder Service
 *
 * الغرض الوحيد: فك رقم الهيكل (VIN) للحصول على البيانات الأساسية.
 *
 * NHTSA لا يقدّم:
 * - المسافة المقطوعة (mileage)
 * - تاريخ الحوادث
 * - الملاك السابقين
 *
 * هذه البيانات تأتي من مزودات خارجية (انظر providers/).
 *
 * API:
 *   GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
 * - مجاني، بدون مفتاح، بدون تسجيل.
 * - يعمل مع كل VINs بصرف النظر عن السوق (لكن دقّة البيانات أعلى لمركبات الـ US).
 */

import type { DecodedVehicleData } from "./types";

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
  ErrorCode?: string;
  ErrorText?: string;
}

interface NhtsaResponse {
  Count: number;
  Message: string;
  Results: NhtsaResult[];
}

/**
 * يحوّل قيمة قد تكون فارغة أو "Not Applicable" إلى undefined.
 */
function clean(v?: string): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (/^not applicable$/i.test(trimmed)) return undefined;
  return trimmed;
}

function mapToDecoded(r: NhtsaResult): DecodedVehicleData {
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
  };
}

export interface DecoderResult {
  /** البيانات الناتجة (قد تكون كل الحقول undefined لو VIN غير معروف) */
  data: DecodedVehicleData;
  /** هل decode نجح بشكل نظيف (NHTSA ErrorCode = "0") */
  cleanDecode: boolean;
  /** هل توفّرت بيانات أساسية على الأقل */
  hasAnyData: boolean;
}

/**
 * يفكّ VIN عبر NHTSA.
 *
 * @throws Error لو الـ network/server فشل (status >= 500).
 *         لا يرمي خطأ لو VIN غير موجود - يُرجع hasAnyData=false.
 */
export async function decodeVinFromNhtsa(vin: string): Promise<DecoderResult> {
  const url = `${NHTSA_BASE}/${encodeURIComponent(vin)}?format=json`;

  const res = await fetch(url, {
    next: { revalidate: 86400 }, // كاش يومي لكل VIN
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`NHTSA API error: ${res.status}`);
  }

  const json = (await res.json()) as NhtsaResponse;
  if (!json.Results?.length) {
    return { data: {}, cleanDecode: false, hasAnyData: false };
  }

  const result = json.Results[0];
  const data = mapToDecoded(result);
  const errorCode = (result.ErrorCode || "").trim();
  const cleanDecode = errorCode === "0";
  const hasAnyData = !!(data.make || data.model || data.modelYear || data.manufacturer);

  return { data, cleanDecode, hasAnyData };
}
