"use client";

import { FormEvent, useState } from "react";
import {
  FileText, Search, ShieldCheck, AlertTriangle, Car, Loader2, X,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { validateVin, normalizeVin, type VehicleReport } from "@/lib/vin";
import { VehicleReportCard } from "@/components/vehicle-report-card";

type Status = "idle" | "loading" | "success" | "error" | "notfound";

export default function VehicleReportPage() {
  const toast = useToast();
  const [vin, setVin] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cleaned = normalizeVin(vin);
    const v = validateVin(cleaned);
    if (!v.valid) {
      toast.error(v.reason || "رقم الهيكل غير صالح.");
      return;
    }

    setStatus("loading");
    setReport(null);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/vehicle-report?vin=${encodeURIComponent(cleaned)}`);
      const json = await res.json();

      if (res.status === 404) {
        setStatus("notfound");
        setErrorMsg(json.error || "لم يتم العثور على بيانات لهذا الرقم.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "تعذّر جلب البيانات.");
        toast.error(json.error || "تعذّر جلب البيانات.");
        return;
      }

      setReport(json as VehicleReport);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("تعذّر الاتصال بالخدمة. تحقق من الإنترنت وحاول مجدداً.");
      toast.error("تعذّر الاتصال بالخدمة.");
    }
  };

  const handleClear = () => {
    setVin("");
    setReport(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const inputLength = normalizeVin(vin).length;

  return (
    <section className="container py-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* رأس الصفحة */}
        <div className="text-center">
          <span className="badge">
            <FileText size={12} className="ml-1" /> تقرير المركبة
          </span>
          <h1 className="mt-3 section-title">
            تحقّق من تاريخ السيارة قبل الشراء
          </h1>
          <p className="section-subtitle mx-auto">
            ابحث برقم الهيكل (VIN) واحصل على المواصفات الرسمية للمركبة من قاعدة بيانات NHTSA الأمريكية مجاناً.
          </p>
        </div>

        {/* نموذج البحث */}
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
          <label htmlFor="vin" className="label">
            رقم الهيكل (VIN)
          </label>
          <div className="relative">
            <input
              id="vin"
              className="input pr-10 font-mono tracking-wider"
              dir="ltr"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="1HGBH41JXMN109186"
              maxLength={17}
              autoComplete="off"
              spellCheck={false}
            />
            {vin && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                aria-label="مسح"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              17 خانة، حروف وأرقام إنجليزية فقط (بدون I, O, Q).
            </span>
            <span
              className={`font-mono font-bold ${
                inputLength === 17
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {inputLength}/17
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={status === "loading" || inputLength !== 17}
              className="btn-primary w-full sm:w-auto"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جارٍ البحث...
                </>
              ) : (
                <>
                  <Search size={16} />
                  ابحث عن التقرير
                </>
              )}
            </button>
          </div>
        </form>

        {/* مصادر البيانات */}
        {status === "idle" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <SourceCard
              title="NHTSA الأمريكية"
              desc="قاعدة بيانات الإدارة الوطنية الأمريكية لسلامة المرور."
              icon={ShieldCheck}
              active
            />
            <SourceCard
              title="CARFAX"
              desc="تقارير الحوادث والملكيات السابقة. قريباً."
              icon={AlertTriangle}
            />
            <SourceCard
              title="AutoCheck"
              desc="تقييم سلامة المركبة وقيمتها. قريباً."
              icon={Car}
            />
          </div>
        )}

        {/* حالات التحميل / النتيجة / الأخطاء */}
        {status === "loading" && <LoadingState />}

        {status === "notfound" && <NotFoundState message={errorMsg} vin={normalizeVin(vin)} />}

        {status === "error" && <ErrorState message={errorMsg} onRetry={handleSubmit as any} />}

        {status === "success" && report && <VehicleReportCard report={report} />}

        {/* CTA: شركاء البيانات */}
        <div className="card border-brand-200 bg-brand-50/40 p-5 text-sm dark:bg-brand-900/10 dark:border-brand-700/40">
          <p className="text-slate-700 dark:text-slate-200">
            هل تملك ورشة أو شركة تأمين أو جهة تسجيل ليبية؟{" "}
            <a
              href="mailto:partners@bratsho.example"
              className="font-bold text-brand-700 dark:text-brand-300 hover:underline"
            >
              انضم كشريك بيانات
            </a>{" "}
            لتظهر بياناتك في التقارير المحلية.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * المكونات الفرعية للحالات
 * ============================================================ */

function SourceCard({
  title,
  desc,
  icon: Icon,
  active = false,
}: {
  title: string;
  desc: string;
  icon: typeof ShieldCheck;
  active?: boolean;
}) {
  return (
    <div
      className={`card p-4 text-center ${
        active ? "border-brand-300 ring-2 ring-brand-100 dark:ring-brand-900/40" : "opacity-75"
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          active
            ? "bg-brand-700 text-white shadow-blue"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        <Icon size={20} />
      </div>
      <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      {active && (
        <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          متاح الآن
        </span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-brand-700 dark:text-brand-300" />
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">
              جارٍ جلب بيانات المركبة...
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              نتواصل مع قاعدة بيانات NHTSA الرسمية.
            </p>
          </div>
        </div>
      </div>

      {/* skeleton */}
      <div className="skeleton h-48" />
      <div className="skeleton h-32" />
    </div>
  );
}

function NotFoundState({ message, vin }: { message: string; vin: string }) {
  return (
    <div className="card animate-fade-in p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <AlertTriangle size={32} />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
        لم يتم العثور على بيانات
      </h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {message}
      </p>
      {vin && (
        <p className="mt-3 inline-block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          VIN: <span dir="ltr">{vin}</span>
        </p>
      )}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="font-bold">نصائح:</p>
        <ul className="mt-2 list-disc space-y-1 pr-4">
          <li>تأكد من قراءة الرقم بدقة (17 خانة).</li>
          <li>NHTSA يغطّي أساساً المركبات المباعة في الولايات المتحدة.</li>
          <li>المركبات الأوروبية أو الآسيوية قد لا تظهر بياناتها بشكل كامل.</li>
        </ul>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card animate-fade-in border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-900/20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
        <AlertTriangle size={28} />
      </div>
      <h3 className="mt-4 text-base font-black text-rose-900 dark:text-rose-200">
        تعذّر جلب البيانات
      </h3>
      <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{message}</p>
      <button onClick={onRetry} className="btn-primary mt-4 inline-flex">
        <Loader2 size={16} />
        إعادة المحاولة
      </button>
    </div>
  );
}
