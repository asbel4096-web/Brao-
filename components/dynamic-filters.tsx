"use client";

import type { Listing } from "@/lib/types";
import { getCategoryConfig, type HomeBucket } from "@/lib/category-config";
import { fuelTypes, transmissionTypes } from "@/lib/categories";

/**
 * ============================================================
 *  DynamicFilters — فلاتر مستقلة لكل قسم
 * ============================================================
 *
 * يعرض الفلاتر *المناسبة لكل قسم* (إضافةً للفلاتر العامة: السعر/المدينة)،
 * معتمداً على القسم المختار:
 *
 *   سيارات   → السنة، الوقود، القير
 *   حافلات   → السنة، عدد المقاعد
 *   شاحنات   → السنة، الحمولة
 *   قطع غيار → الحالة
 *   إطارات   → المقاس
 *   سطحات    → 24 ساعة
 *   خدمات    → نوع الخدمة (عبر الفئة)
 *   حوادث    → نوع الضرر، قابل للإصلاح
 *
 * مفاتيح الفلاتر تُمرَّر كـ Record<string,string>، والفلترة تتم
 * عبر applyDynamicFilters (أدناه) على مصفوفة الإعلانات.
 */

export type DynamicFilterValues = Record<string, string>;

export interface DynamicFilterDef {
  key: string;
  label: string;
  type: "select" | "number" | "toggle";
  options?: string[];
}

const DAMAGE_TYPES = ["أمامي", "خلفي", "جانبي", "شامل", "غمر مياه", "حريق"];
const TOW_TYPES = ["سطحة عادية", "سطحة هيدروليك", "ونش", "سحب ثقيل"];
const CONDITIONS = ["جديد", "مستعمل"];

/** يحدّد فلاتر القسم حسب slug/category name. */
export function filtersForCategory(categoryNameOrSlug: string): DynamicFilterDef[] {
  if (!categoryNameOrSlug) return [];
  const cfg = getCategoryConfig(categoryNameOrSlug);
  const bucket: HomeBucket = cfg.homeBucket;
  const slug = cfg.slug;

  // فلاتر مخصّصة حسب slug الدقيق أولاً
  if (slug === "buses") {
    return [
      { key: "year", label: "السنة", type: "number" },
      { key: "seats", label: "عدد المقاعد", type: "number" },
    ];
  }
  if (slug === "trucks") {
    return [
      { key: "year", label: "السنة", type: "number" },
      { key: "payload", label: "الحمولة (طن)", type: "number" },
    ];
  }
  if (slug === "tires") {
    return [{ key: "tireSize", label: "المقاس", type: "select", options: [] }];
  }
  if (slug === "accident-cars") {
    return [
      { key: "damageType", label: "نوع الضرر", type: "select", options: DAMAGE_TYPES },
      { key: "repairable", label: "قابل للإصلاح", type: "toggle" },
    ];
  }
  if (slug === "tow-truck") {
    return [
      { key: "towType", label: "نوع السطحة", type: "select", options: TOW_TYPES },
      { key: "available24h", label: "خدمة 24 ساعة", type: "toggle" },
    ];
  }

  // فلاتر حسب نوع الدلو (bucket)
  if (bucket === "cars") {
    return [
      { key: "year", label: "السنة", type: "number" },
      { key: "fuel", label: "الوقود", type: "select", options: fuelTypes },
      {
        key: "transmission",
        label: "ناقل الحركة",
        type: "select",
        options: transmissionTypes,
      },
    ];
  }
  if (bucket === "parts") {
    return [
      { key: "condition", label: "الحالة", type: "select", options: CONDITIONS },
    ];
  }
  if (bucket === "tow") {
    return [{ key: "available24h", label: "خدمة 24 ساعة", type: "toggle" }];
  }
  if (bucket === "services") {
    return []; // الخدمات تُفلتر بالمدينة (فلتر عام)
  }
  return [];
}

/** يطبّق فلاتر القسم على مصفوفة الإعلانات. */
export function applyDynamicFilters(
  items: Listing[],
  values: DynamicFilterValues
): Listing[] {
  let arr = items;
  for (const [key, val] of Object.entries(values)) {
    if (!val) continue;
    arr = arr.filter((it) => {
      const fieldVal = (it as any)[key];
      if (key === "available24h" || key === "repairable") {
        return val === "true" ? fieldVal === true : true;
      }
      if (key === "year" || key === "seats" || key === "payload") {
        // مطابقة رقمية (أكبر من أو يساوي للسنة، يساوي للباقي)
        const num = Number(val);
        if (!Number.isFinite(num)) return true;
        if (key === "year") return Number(fieldVal) >= num;
        return Number(fieldVal) === num;
      }
      // نصّي: مطابقة جزئية غير حسّاسة لحالة الأحرف
      return String(fieldVal || "")
        .toLowerCase()
        .includes(String(val).toLowerCase());
    });
  }
  return arr;
}

interface Props {
  category: string;
  values: DynamicFilterValues;
  onChange: (key: string, value: string) => void;
}

export function DynamicFilters({ category, values, onChange }: Props) {
  const filters = filtersForCategory(category);
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {filters.map((f) => {
        if (f.type === "toggle") {
          const on = values[f.key] === "true";
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onChange(f.key, on ? "" : "true")}
              className={
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition " +
                (on
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900")
              }
            >
              {f.label}
              <span
                className={
                  "h-5 w-9 rounded-full transition " +
                  (on ? "bg-brand-600" : "bg-slate-300")
                }
              />
            </button>
          );
        }
        if (f.type === "select") {
          return (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-300">
                {f.label}
              </span>
              <select
                value={values[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">الكل</option>
                {(f.options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        // number
        return (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-300">
              {f.label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={values[f.key] || ""}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.label}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        );
      })}
    </div>
  );
}
