"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ArrowRight, Bell, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fuelTypes, libyaCities, transmissionTypes } from "@/lib/categories";
import type { SearchAlert } from "@/lib/types";

const CONDITIONS = ["جديدة", "ممتازة", "جيدة", "مقبولة", "تحتاج صيانة"];

interface FormState {
  label: string;
  brand: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  priceFrom: string;
  priceTo: string;
  maxMileage: string;
  color: string;
  city: string;
  transmission: string;
  fuelType: string;
  condition: string;
  isActive: boolean;
}

const initial: FormState = {
  label: "",
  brand: "",
  model: "",
  yearFrom: "",
  yearTo: "",
  priceFrom: "",
  priceTo: "",
  maxMileage: "",
  color: "",
  city: "",
  transmission: "",
  fuelType: "",
  condition: "",
  isActive: true,
};

export default function AlertFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/alerts/new");
      return;
    }
    if (!editId) return;

    // تحميل التنبيه للتعديل.
    void (async () => {
      try {
        const snap = await getDoc(
          doc(db, "users", user.uid, "searchAlerts", editId)
        );
        if (!snap.exists()) {
          toast.error("التنبيه غير موجود");
          router.replace("/alerts");
          return;
        }
        const data = snap.data() as SearchAlert;
        setForm({
          label: data.label || "",
          brand: data.brand || "",
          model: data.model || "",
          yearFrom: data.yearFrom?.toString() || "",
          yearTo: data.yearTo?.toString() || "",
          priceFrom: data.priceFrom?.toString() || "",
          priceTo: data.priceTo?.toString() || "",
          maxMileage: data.maxMileage?.toString() || "",
          color: data.color || "",
          city: data.city || "",
          transmission: data.transmission || "",
          fuelType: data.fuelType || "",
          condition: data.condition || "",
          isActive: data.isActive !== false,
        });
      } catch (err: any) {
        toast.error(err.message || "تعذّر تحميل التنبيه");
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [user, authLoading, editId, router, toast]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!user) return;

    // التحقق: لازم على الأقل حقل واحد للمطابقة (وإلا أي إعلان يطابق).
    const hasAnyCriteria =
      form.brand.trim() ||
      form.model.trim() ||
      form.yearFrom ||
      form.yearTo ||
      form.priceFrom ||
      form.priceTo ||
      form.maxMileage ||
      form.color.trim() ||
      form.city.trim() ||
      form.transmission ||
      form.fuelType ||
      form.condition;

    if (!hasAnyCriteria) {
      toast.error("حدّد على الأقل معياراً واحداً للبحث");
      return;
    }

    // التحقق من النطاقات.
    const yearFrom = form.yearFrom ? Number(form.yearFrom) : undefined;
    const yearTo = form.yearTo ? Number(form.yearTo) : undefined;
    if (yearFrom && yearTo && yearFrom > yearTo) {
      toast.error("سنة الصنع: 'من' يجب أن تكون أصغر أو تساوي 'إلى'");
      return;
    }
    const priceFrom = form.priceFrom ? Number(form.priceFrom) : undefined;
    const priceTo = form.priceTo ? Number(form.priceTo) : undefined;
    if (priceFrom != null && priceTo != null && priceFrom > priceTo) {
      toast.error("السعر: 'من' يجب أن تكون أصغر أو تساوي 'إلى'");
      return;
    }

    // ابني الـpayload — حقول فارغة لا تُحفظ (تجنباً للفلاتر الفارغة).
    const payload: any = {
      userId: user.uid,
      isActive: form.isActive,
      updatedAt: serverTimestamp(),
    };
    if (form.label.trim()) payload.label = form.label.trim();
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.model.trim()) payload.model = form.model.trim();
    if (yearFrom != null) payload.yearFrom = yearFrom;
    if (yearTo != null) payload.yearTo = yearTo;
    if (priceFrom != null) payload.priceFrom = priceFrom;
    if (priceTo != null) payload.priceTo = priceTo;
    if (form.maxMileage) payload.maxMileage = Number(form.maxMileage);
    if (form.color.trim()) payload.color = form.color.trim();
    if (form.city.trim()) payload.city = form.city.trim();
    if (form.transmission) payload.transmission = form.transmission;
    if (form.fuelType) payload.fuelType = form.fuelType;
    if (form.condition) payload.condition = form.condition;

    try {
      setSubmitting(true);
      if (editId) {
        await updateDoc(
          doc(db, "users", user.uid, "searchAlerts", editId),
          payload
        );
        toast.success("تم تحديث التنبيه");
      } else {
        payload.createdAt = serverTimestamp();
        payload.notifiedListingIds = [];
        await addDoc(
          collection(db, "users", user.uid, "searchAlerts"),
          payload
        );
        toast.success("تم إنشاء التنبيه");
      }
      router.push("/alerts");
    } catch (err: any) {
      toast.error(err.message || "تعذّر الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingExisting) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/alerts"
            aria-label="رجوع"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowRight size={18} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <Bell size={18} />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            {editId ? "تعديل التنبيه" : "تنبيه جديد"}
          </h1>
        </div>

        {/* Form */}
        <div className="card space-y-4 p-4 sm:p-6">
          {/* الاسم */}
          <div>
            <Label>اسم التنبيه (اختياري)</Label>
            <input
              className="input"
              placeholder="مثال: هونداي أفانتي في طرابلس"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              maxLength={60}
            />
          </div>

          {/* الماركة + الموديل */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>الماركة</Label>
              <input
                className="input"
                placeholder="هونداي"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </div>
            <div>
              <Label>الموديل / الفئة</Label>
              <input
                className="input"
                placeholder="أفانتي"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </div>
          </div>

          {/* السنة من/إلى */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>سنة الصنع - من</Label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="2010"
                value={form.yearFrom}
                onChange={(e) => set("yearFrom", e.target.value)}
              />
            </div>
            <div>
              <Label>سنة الصنع - إلى</Label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="2020"
                value={form.yearTo}
                onChange={(e) => set("yearTo", e.target.value)}
              />
            </div>
          </div>

          {/* السعر من/إلى */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>السعر (د.ل) - من</Label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="20000"
                value={form.priceFrom}
                onChange={(e) => set("priceFrom", e.target.value)}
              />
            </div>
            <div>
              <Label>السعر (د.ل) - إلى</Label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="30000"
                value={form.priceTo}
                onChange={(e) => set("priceTo", e.target.value)}
              />
            </div>
          </div>

          {/* المسافة القصوى + اللون */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>المسافة القصوى (كم)</Label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="150000"
                value={form.maxMileage}
                onChange={(e) => set("maxMileage", e.target.value)}
              />
            </div>
            <div>
              <Label>اللون</Label>
              <input
                className="input"
                placeholder="أبيض"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
              />
            </div>
          </div>

          {/* المدينة + ناقل الحركة */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>المدينة</Label>
              <select
                className="input"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">أي مدينة</option>
                {libyaCities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>ناقل الحركة</Label>
              <select
                className="input"
                value={form.transmission}
                onChange={(e) => set("transmission", e.target.value)}
              >
                <option value="">أي ناقل</option>
                {transmissionTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* الوقود + الحالة */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>نوع الوقود</Label>
              <select
                className="input"
                value={form.fuelType}
                onChange={(e) => set("fuelType", e.target.value)}
              >
                <option value="">أي نوع</option>
                {fuelTypes.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>الحالة</Label>
              <select
                className="input"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              >
                <option value="">أي حالة</option>
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* تفعيل */}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 dark:text-white">
                التنبيه مفعَّل
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                عند إيقاف التفعيل، لن يتم إرسال إشعارات حتى تعيد تفعيله.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-5 w-5 shrink-0 accent-brand-700"
            />
          </label>
        </div>

        {/* الأزرار */}
        <div className="flex gap-2">
          <Link
            href="/alerts"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 text-sm font-black text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {editId ? "حفظ التغييرات" : "إنشاء التنبيه"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">
      {children}
    </label>
  );
}
