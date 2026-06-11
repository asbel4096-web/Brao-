"use client";

import { getCategoryConfig, type FieldDef } from "@/lib/category-config";
import {
  fuelTypes,
  transmissionTypes,
  libyaCities,
} from "@/lib/categories";
import { CAR_BRANDS } from "@/lib/car-brands";

/**
 * ============================================================
 *  DynamicFields — النموذج الديناميكي (المرحلة 2)
 * ============================================================
 *
 * يرسم *الحقول الدقيقة لكل قسم* اعتماداً على getCategoryConfig
 * (مصدر الحقيقة من المرحلة 1). فعند اختيار "سيارات" تظهر حقول
 * السيارة، و"قطع غيار" حقول القطعة، و"سطحة" حقول الخدمة... إلخ.
 *
 * مكوّن مستقل وقابل للإدماج (Controlled):
 *   - values: كائن القيم الحالية (نفس FormState في صفحة add-listing).
 *   - onChange(key, value): يُستدعى عند تغيّر أي حقل.
 *   - onToggle(key, value): للحقول من نوع toggle (boolean).
 *
 * لا يحفظ شيئاً ولا يتعامل مع Firebase — مجرد طبقة عرض.
 * أسماء المفاتيح (key) تطابق حقول Listing في Firestore، فلا يتغيّر
 * التخزين عند إدماجه.
 *
 * يتجاهل الحقول التي تُدار خارجياً (مثل القسم نفسه، الصور) — تبقى
 * مسؤولية الصفحة الحاوية.
 */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export interface DynamicFieldsProps {
  /** slug القسم أو اسمه العربي. */
  category: string;
  values: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
  onToggle?: (key: string, value: boolean) => void;
  /** مفاتيح حقول نريد تخطّيها (تُدار في مكان آخر بالصفحة). */
  skipKeys?: string[];
}

export function DynamicFields({
  category,
  values,
  onChange,
  onToggle,
  skipKeys = [],
}: DynamicFieldsProps) {
  const config = getCategoryConfig(category);
  const fields = config.fields.filter((f) => !skipKeys.includes(f.key));

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={onChange}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ---------------- رسم حقل واحد حسب نوعه ---------------- */

function FieldRenderer({
  field,
  value,
  onChange,
  onToggle,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: string) => void;
  onToggle?: (key: string, value: boolean) => void;
}) {
  const strValue = typeof value === "string" || typeof value === "number" ? String(value) : "";

  const label = (
    <span className="mb-1.5 block text-[13px] font-black text-slate-700 dark:text-slate-200">
      {field.label}
      {field.required && <span className="text-rose-500"> *</span>}
    </span>
  );

  // toggle (متاح الآن...)
  if (field.type === "toggle") {
    const on = value === true || value === "true";
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-[13px] font-black text-slate-700 dark:text-slate-200">
          {field.label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onToggle?.(field.key, !on)}
          className={
            "relative h-6 w-11 shrink-0 rounded-full transition " +
            (on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")
          }
        >
          <span
            className={
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition " +
              (on ? "right-0.5" : "right-[22px]")
            }
          />
        </button>
      </label>
    );
  }

  // textarea
  if (field.type === "textarea") {
    return (
      <label className="block">
        {label}
        <textarea
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={inputCls + " resize-none"}
        />
        {field.hint && <Hint text={field.hint} />}
      </label>
    );
  }

  // select (الحالة، ناقل الحركة، الوقود...)
  if (field.type === "select") {
    // نفضّل ثوابت المشروع للوقود/الناقل لضمان توافق الخيارات.
    let opts = field.options ?? [];
    if (field.key === "fuel") opts = fuelTypes;
    else if (field.key === "transmission") opts = transmissionTypes;
    return (
      <label className="block">
        {label}
        <select
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        >
          <option value="">اختر</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {field.hint && <Hint text={field.hint} />}
      </label>
    );
  }

  // المدينة
  if (field.type === "city") {
    return (
      <label className="block">
        {label}
        <select
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        >
          <option value="">اختر المدينة</option>
          {libyaCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // الماركة
  if (field.type === "brand") {
    return (
      <label className="block">
        {label}
        <select
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        >
          <option value="">اختر الماركة</option>
          {CAR_BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameAr}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // سنة الصنع
  if (field.type === "year") {
    const current = new Date().getFullYear() + 1;
    const years: number[] = [];
    for (let y = current; y >= 1980; y--) years.push(y);
    return (
      <label className="block">
        {label}
        <select
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        >
          <option value="">اختر السنة</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // rating (تقييم)
  if (field.type === "rating") {
    const num = Number(strValue) || 0;
    return (
      <div className="block">
        {label}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(field.key, String(n))}
              className={
                "text-2xl transition " +
                (n <= num ? "text-amber-400" : "text-slate-300 dark:text-slate-600")
              }
              aria-label={`${n} نجوم`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    );
  }

  // price / number / phone / text / model
  const inputType =
    field.type === "price" || field.type === "number"
      ? "number"
      : field.type === "phone"
      ? "tel"
      : "text";

  return (
    <label className="block">
      {label}
      <div className="relative">
        <input
          type={inputType}
          inputMode={inputType === "number" ? "numeric" : undefined}
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          dir={field.type === "phone" ? "ltr" : undefined}
          className={inputCls + (field.type === "price" ? " pl-12" : "")}
        />
        {field.type === "price" && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            د.ل
          </span>
        )}
      </div>
      {field.hint && <Hint text={field.hint} />}
    </label>
  );
}

function Hint({ text }: { text: string }) {
  return <span className="mt-1 block text-[11px] text-slate-400">{text}</span>;
}
