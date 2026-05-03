"use client";

import {
  Car, Factory, Calendar, Cog, Fuel, Gauge, MapPin, Wrench,
  CircleDot, Settings2, Hash, Info, Zap,
} from "lucide-react";
import type { VehicleReport, VehicleData } from "@/lib/vin";

interface FieldDef {
  label: string;
  value?: string;
  icon: typeof Car;
  /** يُعرض في القسم العلوي البارز */
  hero?: boolean;
}

export function VehicleReportCard({ report }: { report: VehicleReport }) {
  const d = report.data;

  // الحقول البارزة في الأعلى (hero)
  const hero: FieldDef[] = [
    { label: "الشركة المصنعة", value: d.make, icon: Factory, hero: true },
    { label: "الموديل", value: d.model, icon: Car, hero: true },
    { label: "سنة الصنع", value: d.modelYear, icon: Calendar, hero: true },
  ];

  // باقي الحقول
  const specs: FieldDef[] = [
    { label: "نوع المركبة", value: d.vehicleType, icon: Car },
    { label: "فئة الهيكل", value: d.bodyClass, icon: Car },
    { label: "السلسلة", value: d.series, icon: Hash },
    { label: "الفئة (Trim)", value: d.trim, icon: Hash },
    { label: "المحرك", value: formatEngine(d), icon: Cog },
    { label: "الأسطوانات", value: d.engineCylinders, icon: Settings2 },
    { label: "قدرة المحرك", value: d.engineHP ? `${d.engineHP} حصان` : undefined, icon: Zap },
    { label: "نوع الوقود", value: d.fuelType, icon: Fuel },
    { label: "نظام الدفع", value: d.driveType, icon: Gauge },
    { label: "ناقل الحركة", value: formatTransmission(d), icon: Settings2 },
    { label: "عدد الأبواب", value: d.doors, icon: CircleDot },
    { label: "عدد المقاعد", value: d.seats, icon: CircleDot },
    { label: "بلد الصنع", value: d.plantCountry, icon: MapPin },
    { label: "مدينة المصنع", value: formatPlant(d), icon: Wrench },
    { label: "المُصنِّع", value: d.manufacturer, icon: Factory },
  ];

  const visibleSpecs = specs.filter((f) => f.value);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* بطاقة الـ hero — الشركة + الموديل + السنة بشكل بارز */}
      <div
        className="
          relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c]
          p-5 text-white shadow-blue
          sm:p-6
        "
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-action-500/20 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-bold backdrop-blur">
              <Info size={12} />
              مصدر: {report.source}
            </span>
            {report.decoded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 font-bold">
                ✓ تم فك التشفير
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            {[d.make, d.model].filter(Boolean).join(" ") || "مركبة غير معروفة"}
            {d.modelYear && (
              <span className="ml-2 text-white/70">{d.modelYear}</span>
            )}
          </h2>

          {(d.bodyClass || d.vehicleType) && (
            <p className="mt-1 text-sm text-white/80 sm:text-base">
              {[d.bodyClass, d.vehicleType].filter(Boolean).join(" • ")}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur">
            <Hash size={14} className="text-white/70" />
            <span className="text-xs text-white/70">رقم الهيكل:</span>
            <span dir="ltr" className="font-mono text-sm font-bold tracking-wider">
              {report.vin}
            </span>
          </div>

          {/* hero stats - يظهر القيم الموجودة فقط */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {hero.map((f) => (
              <HeroStat key={f.label} field={f} />
            ))}
          </div>
        </div>
      </div>

      {/* تنبيه إن لم يكن decoded clean */}
      {!report.decoded && report.errorText && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            ملاحظة من NHTSA:
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            {report.errorText}
          </p>
        </div>
      )}

      {/* بطاقة المواصفات التفصيلية */}
      {visibleSpecs.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h3 className="mb-4 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            المواصفات التفصيلية
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSpecs.map((f) => (
              <SpecRow key={f.label} field={f} />
            ))}
          </div>
        </div>
      )}

      {/* ملاحظات */}
      {d.notes && (
        <div className="card p-5 sm:p-6">
          <h3 className="mb-2 inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            <Info size={18} className="text-brand-700 dark:text-brand-300" />
            ملاحظات
          </h3>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {d.notes}
          </p>
        </div>
      )}

      {/* خانة المستقبل: شركاء البيانات (CARFAX إلخ) */}
      <div
        className="
          rounded-3xl border border-dashed border-slate-300 bg-slate-50/50
          p-5 text-center
          dark:border-slate-700 dark:bg-slate-800/30
        "
      >
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          🔓 قريباً: تقرير الحوادث والملكيات السابقة عبر شركائنا (CARFAX / AutoCheck)
        </p>
      </div>
    </div>
  );
}

function HeroStat({ field }: { field: FieldDef }) {
  const Icon = field.icon;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] text-white/70 sm:text-xs">
        <Icon size={11} />
        {field.label}
      </div>
      <div className="mt-1 truncate text-sm font-black sm:text-base">
        {field.value || <span className="text-white/40">—</span>}
      </div>
    </div>
  );
}

function SpecRow({ field }: { field: FieldDef }) {
  const Icon = field.icon;
  return (
    <div
      className="
        flex items-start gap-3 rounded-2xl border border-slate-200
        bg-slate-50/60 p-3
        dark:border-slate-700 dark:bg-slate-800/60
      "
    >
      <div
        className="
          flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
          bg-brand-50 text-brand-700
          dark:bg-brand-900/40 dark:text-brand-300
        "
      >
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {field.label}
        </p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">
          {field.value}
        </p>
      </div>
    </div>
  );
}

function formatEngine(d: VehicleData): string | undefined {
  const parts: string[] = [];
  if (d.engineDisplacementL) parts.push(`${d.engineDisplacementL}L`);
  if (d.engineModel) parts.push(d.engineModel);
  return parts.length ? parts.join(" ") : undefined;
}

function formatTransmission(d: VehicleData): string | undefined {
  const parts: string[] = [];
  if (d.transmissionStyle) parts.push(d.transmissionStyle);
  if (d.transmissionSpeeds) parts.push(`${d.transmissionSpeeds} سرعات`);
  return parts.length ? parts.join(" - ") : undefined;
}

function formatPlant(d: VehicleData): string | undefined {
  const parts = [d.plantCity, d.plantState].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}
