"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Tag, Save, Loader2, RotateCcw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  PROMO_KEYS,
  PROMO_META,
  DEFAULT_PROMO_PRICING,
  PROMO_PRICE_MIN,
  PROMO_PRICE_MAX,
  type PromoServiceKey,
} from "@/lib/wallet/promo-pricing";

/**
 * /admin/pricing — تعديل أسعار باقات الترقية (مميّز/مموّل/VIP/عاجل).
 *
 * يقرأ ويكتب عبر /api/admin/pricing (Admin SDK). السيرفر هو مصدر الحقيقة
 * عند الشراء — العميل لا يُرسل السعر أبداً.
 */
export default function AdminPricingPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState<Record<PromoServiceKey, string>>({
    featured: String(DEFAULT_PROMO_PRICING.featured),
    boost: String(DEFAULT_PROMO_PRICING.boost),
    vip: String(DEFAULT_PROMO_PRICING.vip),
    urgent: String(DEFAULT_PROMO_PRICING.urgent),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/pricing", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.pricing) {
          setValues({
            featured: String(data.pricing.featured),
            boost: String(data.pricing.boost),
            vip: String(data.pricing.vip),
            urgent: String(data.pricing.urgent),
          });
        }
      } catch {
        /* نُبقي الافتراضي */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    // تحقّق محلي قبل الإرسال (السيرفر يتحقّق أيضاً).
    const payload: Record<string, number> = {};
    for (const k of PROMO_KEYS) {
      const n = Number(values[k]);
      if (!Number.isFinite(n) || n < PROMO_PRICE_MIN || n > PROMO_PRICE_MAX) {
        toast.error(
          `سعر "${PROMO_META[k].label}" غير صالح (بين ${PROMO_PRICE_MIN} و ${PROMO_PRICE_MAX}).`
        );
        return;
      }
      payload[k] = Math.round(n);
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "فشل الحفظ");
      }
      toast.success("تم حفظ الأسعار وتطبيقها فوراً");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setValues({
      featured: String(DEFAULT_PROMO_PRICING.featured),
      boost: String(DEFAULT_PROMO_PRICING.boost),
      vip: String(DEFAULT_PROMO_PRICING.vip),
      urgent: String(DEFAULT_PROMO_PRICING.urgent),
    });
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" />
      </div>
    );
  }
  if ((profile as any)?.isAdmin !== true) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        هذه الصفحة للأدمن فقط.
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            أسعار الباقات
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            تعديل أسعار باقات الترقية — تُطبَّق فوراً على الجميع.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs font-bold text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
        السعر بوحدة BC. السيرفر يتحقّق من السعر عند كل عملية شراء، فلا يمكن
        لأي مستخدم الدفع بأقل من السعر المحدّد هنا.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROMO_KEYS.map((k) => {
          const meta = PROMO_META[k];
          return (
            <div
              key={k}
              className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-action-50 text-lg dark:bg-action-500/15">
                  {meta.emoji}
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {meta.label}
                  </h3>
                  <p className="text-[11px] text-slate-400">{meta.hint}</p>
                </div>
              </div>
              <label className="relative block">
                <input
                  type="number"
                  inputMode="numeric"
                  min={PROMO_PRICE_MIN}
                  max={PROMO_PRICE_MAX}
                  disabled={loading || saving}
                  value={values[k]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [k]: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-14 text-lg font-black tabular-nums text-slate-900 outline-none transition focus:border-brand-400 focus:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  BC
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-action-500 py-3.5 text-sm font-black text-white shadow-action transition hover:bg-action-600 active:scale-[0.99] disabled:opacity-60 sm:flex-none sm:px-8"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ الأسعار
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-3.5 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RotateCcw size={14} />
          القيم الافتراضية
        </button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <Tag size={12} />
        تغيير السعر لا يؤثّر على الحملات الجارية، فقط على عمليات الشراء الجديدة.
      </p>
    </div>
  );
}
