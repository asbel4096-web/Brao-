"use client";

import { FormEvent, useState } from "react";
import {
  FileText, Search, ShieldCheck, AlertTriangle, Calendar, Car, ExternalLink,
} from "lucide-react";

export default function VehicleReportPage() {
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="container py-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <span className="badge">
            <FileText size={12} className="ml-1" /> تقارير المركبات
          </span>
          <h1 className="mt-3 section-title">تحقّق من تاريخ السيارة قبل الشراء</h1>
          <p className="section-subtitle mx-auto">
            ابحث عبر رقم الهيكل (VIN) أو رقم اللوحة عن سجل الحوادث، الملكيات السابقة،
            وتقرير الفحص الفني.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">رقم الهيكل (VIN)</label>
              <input
                className="input"
                dir="ltr"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="مثال: 1HGBH41JXMN109186"
                maxLength={17}
              />
              <p className="mt-1 text-xs text-slate-500">17 خانة عادةً.</p>
            </div>
            <div>
              <label className="label">رقم اللوحة (اختياري)</label>
              <input
                className="input"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="مثال: 12345 طرابلس"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn-primary" disabled={!vin && !plate}>
              <Search size={16} /> ابحث عن التقرير
            </button>
          </div>
        </form>

        <div className="grid gap-3 sm:grid-cols-3">
          <Source
            title="الإدارة العامة للمرور"
            desc="السجل الرسمي للمخالفات والترخيص."
            icon={ShieldCheck}
          />
          <Source
            title="شركات التأمين"
            desc="بلاغات الحوادث والتعويضات."
            icon={AlertTriangle}
          />
          <Source
            title="ورش الصيانة الشريكة"
            desc="تاريخ الصيانة الدورية."
            icon={Car}
          />
        </div>

        {submitted && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black dark:text-white">
                    البحث عن التقرير...
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    خدمة التقارير الفعلية قيد الربط مع الجهات الرسمية. سيتم إعلامك
                    بمجرد توفّرها للمنطقة الجغرافية لمركبتك.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ReportCard
                icon={Calendar}
                title="تاريخ التسجيل"
                value="غير متاح"
                color="text-brand-700"
              />
              <ReportCard
                icon={ShieldCheck}
                title="الفحص الفني"
                value="غير متاح"
                color="text-emerald-700"
              />
              <ReportCard
                icon={AlertTriangle}
                title="الحوادث"
                value="غير متاح"
                color="text-rose-700"
              />
              <ReportCard
                icon={Car}
                title="الملكيات السابقة"
                value="غير متاح"
                color="text-action-700"
              />
            </div>
          </div>
        )}

        <div className="card border-brand-200 bg-brand-50/40 p-5 text-sm dark:bg-brand-900/10 dark:border-brand-700/40">
          <p className="text-slate-700 dark:text-slate-200">
            هل تملك ورشة أو شركة تأمين أو جهة تسجيل؟{" "}
            <a href="#" className="font-bold text-brand-700 dark:text-brand-300 hover:underline inline-flex items-center gap-1">
              انضم كشريك بيانات <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Source({ title, desc, icon: Icon }: any) {
  return (
    <div className="card p-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
        <Icon size={20} />
      </div>
      <h3 className="mt-3 text-sm font-black dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function ReportCard({ icon: Icon, title, value, color }: any) {
  return (
    <div className="card p-4">
      <div className={`mb-2 ${color}`}><Icon size={20} /></div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-base font-black text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}
