"use client";

import {
  Car, Factory, Calendar, Cog, Fuel, Gauge, MapPin, Wrench,
  CircleDot, Settings2, Hash, Info, Zap, AlertTriangle, ShieldCheck,
  Users, Globe, FileCheck, ScrollText,
} from "lucide-react";
import type {
  VehicleReportResponse, DecodedVehicleData, VehicleHistoryData,
  TitleStatus, InspectionStatus, AccidentRecord, OwnershipRecord,
} from "@/lib/vehicle-report/types";
import { marketLabel } from "@/lib/vin";

/* ==========================================================================
 * البطاقة الرئيسية - تحدد ما يُعرض حسب status
 * ========================================================================== */

export function VehicleReportCard({ report }: { report: VehicleReportResponse }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <ReportHeroBanner report={report} />

      {report.messages && report.messages.length > 0 && (
        <MessagesPanel messages={report.messages} />
      )}

      {report.decoded && <DecodedSection decoded={report.decoded} />}

      {report.history && (
        <HistorySection history={report.history} />
      )}

      <ProviderFooter report={report} />
    </div>
  );
}

/* ==========================================================================
 * Hero Banner - الاسم + السنة + VIN + شارة الحالة
 * ========================================================================== */

function ReportHeroBanner({ report }: { report: VehicleReportResponse }) {
  const d = report.decoded;
  const carName = [d?.make, d?.model].filter(Boolean).join(" ") || "مركبة غير معروفة";

  const statusBadge = getStatusBadge(report.status);

  return (
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold backdrop-blur ${statusBadge.cls}`}
          >
            {statusBadge.icon} {statusBadge.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-bold backdrop-blur">
            <Globe size={11} />
            السوق: {marketLabel(report.market)}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-black sm:text-3xl">
          {carName}
          {d?.modelYear && <span className="ml-2 text-white/70">{d.modelYear}</span>}
        </h2>

        {(d?.bodyClass || d?.vehicleType) && (
          <p className="mt-1 text-sm text-white/80 sm:text-base">
            {[d?.bodyClass, d?.vehicleType].filter(Boolean).join(" • ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur">
          <Hash size={14} className="text-white/70" />
          <span className="text-xs text-white/70">رقم الهيكل:</span>
          <span dir="ltr" className="font-mono text-sm font-bold tracking-wider">
            {report.vin}
          </span>
        </div>

        {d && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <HeroStat label="الشركة المصنعة" value={d.make} icon={Factory} />
            <HeroStat label="الموديل" value={d.model} icon={Car} />
            <HeroStat label="سنة الصنع" value={d.modelYear} icon={Calendar} />
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadge(status: VehicleReportResponse["status"]) {
  switch (status) {
    case "FULL_REPORT":
      return { label: "تقرير كامل", cls: "bg-emerald-500/95 text-white", icon: "✓" };
    case "DECODE_ONLY":
      return { label: "بيانات أساسية فقط", cls: "bg-amber-500/95 text-white", icon: "ⓘ" };
    case "NOT_FOUND":
      return { label: "غير موجود", cls: "bg-rose-500/95 text-white", icon: "✗" };
    case "PROVIDER_ERROR":
      return { label: "خطأ من المصدر", cls: "bg-rose-600/95 text-white", icon: "!" };
    default:
      return { label: "غير معروف", cls: "bg-slate-500/95 text-white", icon: "?" };
  }
}

function HeroStat({
  label, value, icon: Icon,
}: { label: string; value?: string; icon: typeof Car }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] text-white/70 sm:text-xs">
        <Icon size={11} />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black sm:text-base">
        {value || <span className="text-white/40">—</span>}
      </div>
    </div>
  );
}

/* ==========================================================================
 * Messages panel - رسائل المزوّد (مهم للمسافة المقطوعة غير المتوفرة)
 * ========================================================================== */

function MessagesPanel({ messages }: { messages: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <Info size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
        <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
          {messages.map((m, i) => (
            <li key={i} className="leading-relaxed">{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Decoded section - من NHTSA دائماً
 * ========================================================================== */

function DecodedSection({ decoded }: { decoded: DecodedVehicleData }) {
  const specs: Array<{ label: string; value?: string; icon: typeof Car }> = [
    { label: "نوع المركبة", value: decoded.vehicleType, icon: Car },
    { label: "فئة الهيكل", value: decoded.bodyClass, icon: Car },
    { label: "السلسلة", value: decoded.series, icon: Hash },
    { label: "الفئة (Trim)", value: decoded.trim, icon: Hash },
    { label: "المحرك", value: formatEngine(decoded), icon: Cog },
    { label: "الأسطوانات", value: decoded.engineCylinders, icon: Settings2 },
    {
      label: "قدرة المحرك",
      value: decoded.engineHP ? `${decoded.engineHP} حصان` : undefined,
      icon: Zap,
    },
    { label: "نوع الوقود", value: decoded.fuelType, icon: Fuel },
    { label: "نظام الدفع", value: decoded.driveType, icon: Gauge },
    { label: "ناقل الحركة", value: formatTransmission(decoded), icon: Settings2 },
    { label: "عدد الأبواب", value: decoded.doors, icon: CircleDot },
    { label: "عدد المقاعد", value: decoded.seats, icon: CircleDot },
    { label: "بلد التصنيع", value: decoded.plantCountry, icon: MapPin },
    { label: "مدينة المصنع", value: formatPlant(decoded), icon: Wrench },
    { label: "المُصنِّع", value: decoded.manufacturer, icon: Factory },
  ];

  const visible = specs.filter((s) => s.value);
  if (visible.length === 0) return null;

  return (
    <div className="card p-5 sm:p-6">
      <SectionTitle icon={Cog} title="المواصفات الأساسية" subtitle="من قاعدة NHTSA" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <SpecRow key={s.label} label={s.label} value={s.value!} icon={s.icon} />
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
 * History section - من المزوّد الإقليمي
 * ========================================================================== */

function HistorySection({ history }: { history: VehicleHistoryData }) {
  // كل قسم يُعرض فقط إذا كانت بياناته موجودة
  const hasMileage = typeof history.mileage === "number";
  const hasAccidents = typeof history.accidentCount === "number" || (history.accidents?.length ?? 0) > 0;
  const hasOwners = typeof history.previousOwnersCount === "number" || (history.previousOwners?.length ?? 0) > 0;
  const hasTitle = !!history.titleStatus;
  const hasImport = !!history.importCountry;
  const hasInspection = !!history.inspectionStatus;
  const hasNotes = (history.notes?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* خلاصة سريعة - 4 بطاقات إحصائية */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hasMileage && (
          <StatBox
            icon={Gauge}
            label="المسافة المقطوعة"
            value={formatMileage(history.mileage!, history.mileageUnit)}
            color="brand"
          />
        )}
        {hasAccidents && (
          <StatBox
            icon={AlertTriangle}
            label="عدد الحوادث"
            value={(history.accidentCount ?? history.accidents?.length ?? 0).toString()}
            color={(history.accidentCount ?? 0) === 0 ? "emerald" : "rose"}
          />
        )}
        {hasOwners && (
          <StatBox
            icon={Users}
            label="الملاك السابقين"
            value={(history.previousOwnersCount ?? history.previousOwners?.length ?? 0).toString()}
            color="brand"
          />
        )}
        {hasTitle && (
          <StatBox
            icon={ShieldCheck}
            label="حالة العنوان"
            value={titleStatusLabel(history.titleStatus!)}
            color={history.titleStatus === "clean" ? "emerald" : "amber"}
          />
        )}
      </div>

      {/* قسم الحوادث */}
      {(history.accidents?.length ?? 0) > 0 && (
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={AlertTriangle} title="سجل الحوادث" />
          <div className="space-y-3">
            {history.accidents!.map((a, i) => (
              <AccidentItem key={i} accident={a} />
            ))}
          </div>
        </div>
      )}

      {/* قسم الملاك */}
      {(history.previousOwners?.length ?? 0) > 0 && (
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={Users} title="الملاك السابقون" />
          <div className="space-y-2">
            {history.previousOwners!.map((o) => (
              <OwnershipItem key={o.ownerNumber} owner={o} />
            ))}
          </div>
        </div>
      )}

      {/* قسم بلد الاستيراد + الفحص الفني */}
      {(hasImport || hasInspection) && (
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={FileCheck} title="معلومات إضافية" />
          <div className="grid gap-3 sm:grid-cols-2">
            {hasImport && (
              <SpecRow label="بلد الاستيراد" value={history.importCountry!} icon={Globe} />
            )}
            {hasInspection && (
              <SpecRow
                label="الفحص الفني"
                value={`${inspectionStatusLabel(history.inspectionStatus!)}${
                  history.inspectionDate ? ` (${formatDate(history.inspectionDate)})` : ""
                }`}
                icon={FileCheck}
              />
            )}
            {history.mileageDate && hasMileage && (
              <SpecRow
                label="تاريخ آخر قراءة للعدّاد"
                value={formatDate(history.mileageDate)}
                icon={Calendar}
              />
            )}
          </div>
        </div>
      )}

      {/* ملاحظات */}
      {hasNotes && (
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={ScrollText} title="ملاحظات" />
          <ul className="space-y-2">
            {history.notes!.map((n, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AccidentItem({ accident }: { accident: AccidentRecord }) {
  const sevColor =
    accident.severity === "totaled" ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800" :
    accident.severity === "severe" ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800" :
    accident.severity === "moderate" ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" :
    "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        {accident.severity && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-black ${sevColor}`}>
            {severityLabel(accident.severity)}
          </span>
        )}
        {accident.date && (
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {formatDate(accident.date)}
          </span>
        )}
        {accident.location && (
          <span className="text-xs text-slate-600 dark:text-slate-400">
            • {accident.location}
          </span>
        )}
      </div>
      {accident.description && (
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {accident.description}
        </p>
      )}
    </div>
  );
}

function OwnershipItem({ owner }: { owner: OwnershipRecord }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <span className="text-sm font-black">#{owner.ownerNumber}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          {ownerTypeLabel(owner.type)}
          {owner.region && <span className="font-bold text-slate-500"> - {owner.region}</span>}
        </p>
        {(owner.startDate || owner.endDate) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(owner.startDate)} → {owner.endDate ? formatDate(owner.endDate) : "حالياً"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
 * Provider Footer - يخبر من أين جاءت البيانات
 * ========================================================================== */

function ProviderFooter({ report }: { report: VehicleReportResponse }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400">
      <p>
        فك VIN: <span className="font-bold">{report.decoderSource}</span>
        {report.historyProvider && (
          <>
            {" • "}
            تاريخ المركبة:{" "}
            <span className="font-bold">{report.historyProvider}</span>
          </>
        )}
      </p>
    </div>
  );
}

/* ==========================================================================
 * مكونات عامة
 * ========================================================================== */

function SectionTitle({
  icon: Icon, title, subtitle,
}: { icon: typeof Car; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function SpecRow({
  label, value, icon: Icon,
}: { label: string; value: string; icon: typeof Car }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

const STAT_COLORS = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function StatBox({
  icon: Icon, label, value, color,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  color: keyof typeof STAT_COLORS;
}) {
  return (
    <div className="card p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${STAT_COLORS[color]}`}>
        <Icon size={18} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
        {value}
      </p>
    </div>
  );
}

/* ==========================================================================
 * Helpers
 * ========================================================================== */

function formatEngine(d: DecodedVehicleData): string | undefined {
  const parts: string[] = [];
  if (d.engineDisplacementL) parts.push(`${d.engineDisplacementL}L`);
  if (d.engineModel) parts.push(d.engineModel);
  return parts.length ? parts.join(" ") : undefined;
}

function formatTransmission(d: DecodedVehicleData): string | undefined {
  const parts: string[] = [];
  if (d.transmissionStyle) parts.push(d.transmissionStyle);
  if (d.transmissionSpeeds) parts.push(`${d.transmissionSpeeds} سرعات`);
  return parts.length ? parts.join(" - ") : undefined;
}

function formatPlant(d: DecodedVehicleData): string | undefined {
  const parts = [d.plantCity, d.plantState].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function formatMileage(value: number, unit?: "km" | "mi"): string {
  const safeUnit = unit || "km";
  const label = safeUnit === "mi" ? "ميل" : "كم";
  return `${value.toLocaleString("ar-LY")} ${label}`;
}

function titleStatusLabel(status: TitleStatus): string {
  switch (status) {
    case "clean": return "نظيف";
    case "salvage": return "خردة";
    case "rebuilt": return "معاد بناؤها";
    case "flood": return "غرق";
    case "lemon": return "Lemon";
    case "junk": return "Junk";
    case "unknown":
    default: return "غير معروف";
  }
}

function inspectionStatusLabel(status: InspectionStatus): string {
  switch (status) {
    case "passed": return "اجتاز";
    case "failed": return "لم يجتز";
    case "expired": return "منتهي الصلاحية";
    case "unknown":
    default: return "غير معروف";
  }
}

function severityLabel(s: NonNullable<AccidentRecord["severity"]>): string {
  switch (s) {
    case "minor": return "بسيط";
    case "moderate": return "متوسط";
    case "severe": return "شديد";
    case "totaled": return "خسارة كاملة";
  }
}

function ownerTypeLabel(t?: OwnershipRecord["type"]): string {
  switch (t) {
    case "personal": return "مالك شخصي";
    case "lease": return "إيجار";
    case "rental": return "تأجير";
    case "fleet": return "أسطول شركة";
    case "dealer": return "وكالة";
    default: return "مالك";
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
