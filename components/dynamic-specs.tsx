"use client";

import {
  Gauge,
  Settings,
  Fuel,
  Calendar,
  Car,
  Cog,
  CheckCircle2,
  Wrench,
  Star,
  MapPin,
  Users,
  Truck,
  Zap,
  Clock,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { getCategoryConfig, type HomeBucket } from "@/lib/category-config";

/**
 * ============================================================
 *  DynamicSpecs — مواصفات صفحة التفاصيل حسب القسم
 * ============================================================
 *
 * يعرض شبكة المواصفات *المناسبة لكل قسم* بدل حقول سيارة ثابتة:
 *   cars      → عداد/ناقل/وقود/سنة/ماركة/محرك
 *   parts     → الحالة/السيارة المتوافقة
 *   tow       → مناطق التغطية/متاح الآن
 *   services  → التقييم
 *
 * قاعدة صارمة: *لا يُعرض أي حقل فارغ* (لا "-"، لا N/A، لا undefined).
 * لو لا توجد مواصفات صالحة للقسم، لا يُعرض القسم إطلاقاً.
 */

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return Boolean(v);
}

interface SpecItem {
  icon: any;
  label: string;
  value: string;
}

function buildSpecs(listing: Listing, bucket: HomeBucket): SpecItem[] {
  const l = listing as Listing & {
    condition?: string;
    compatibleCar?: string;
    coverageAreas?: string;
    availableNow?: boolean;
    rating?: number;
    seats?: number;
    payload?: number;
    voltage?: string;
    usagePercent?: number;
    capacity?: string;
    oilType?: string;
    tireSize?: string;
    tireCount?: number;
    towType?: string;
    available24h?: boolean;
    damageType?: string;
    repairable?: boolean;
  };
  const specs: SpecItem[] = [];
  const push = (cond: unknown, icon: any, label: string, value: string) => {
    if (hasValue(cond)) specs.push({ icon, label, value });
  };

  if (bucket === "cars") {
    push(
      l.mileage,
      Gauge,
      "العداد",
      `${Number(l.mileage).toLocaleString("en-US")} كم`
    );
    push(l.transmission, Settings, "ناقل الحركة", String(l.transmission));
    push(l.fuel, Fuel, "الوقود", String(l.fuel));
    push(l.year, Calendar, "السنة", String(l.year));
    push(l.brand, Car, "الماركة", String(l.brand));
    push(l.engine, Cog, "المحرك", String(l.engine));
    // حقول الحافلات/الشاحنات المتخصّصة
    push(l.seats, Users, "عدد المقاعد", String(l.seats));
    push(l.payload, Truck, "الحمولة", `${l.payload} طن`);
    return specs;
  }

  if (bucket === "parts") {
    push(l.condition, CheckCircle2, "الحالة", String(l.condition));
    push(
      l.compatibleCar,
      Car,
      "السيارة المتوافقة",
      String(l.compatibleCar)
    );
    push(l.brand, Car, "الماركة", String(l.brand));
    push(l.year, Calendar, "السنة", String(l.year));
    // حقول قطع الغيار المتخصّصة
    push(l.voltage, Zap, "الفولت", String(l.voltage));
    push(
      l.usagePercent,
      Gauge,
      "نسبة الاستخدام",
      `${l.usagePercent}%`
    );
    push(l.capacity, Cog, "السعة", String(l.capacity));
    push(l.oilType, Fuel, "النوع", String(l.oilType));
    push(l.tireSize, Settings, "المقاس", String(l.tireSize));
    push(l.tireCount, CheckCircle2, "العدد", String(l.tireCount));
    return specs;
  }

  if (bucket === "tow") {
    push(l.towType, Truck, "نوع السطحة", String(l.towType));
    push(
      l.coverageAreas,
      MapPin,
      "مناطق التغطية",
      String(l.coverageAreas)
    );
    if (l.available24h === true)
      specs.push({ icon: Clock, label: "الخدمة", value: "24 ساعة" });
    if (l.availableNow === true)
      specs.push({ icon: CheckCircle2, label: "الحالة", value: "متاح الآن" });
    return specs;
  }

  if (bucket === "services") {
    push(
      l.rating,
      Star,
      "التقييم",
      hasValue(l.rating) ? Number(l.rating).toFixed(1) : ""
    );
    specs.push({ icon: Wrench, label: "النوع", value: "خدمة" });
    return specs;
  }

  // قسم خاص (حوادث): نوع الضرر + قابلية الإصلاح
  push(l.damageType, Wrench, "نوع الضرر", String(l.damageType));
  if (l.repairable === true)
    specs.push({ icon: CheckCircle2, label: "الإصلاح", value: "قابلة للإصلاح" });
  push(l.year, Calendar, "السنة", String(l.year));
  push(l.brand, Car, "الماركة", String(l.brand));
  return specs;
}

export function DynamicSpecs({ listing }: { listing: Listing }) {
  const bucket = getCategoryConfig(listing.category || "").homeBucket;
  const specs = buildSpecs(listing, bucket);

  // لا مواصفات صالحة → لا نعرض القسم إطلاقاً (لا شبكة فارغة)
  if (specs.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {specs.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800"
        >
          <s.icon
            size={20}
            className="mx-auto text-[#2563EB]"
            strokeWidth={1.8}
          />
          <div className="mt-1.5 truncate text-sm font-black text-slate-900 dark:text-white">
            {s.value}
          </div>
          <div className="text-[11px] font-bold text-slate-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
