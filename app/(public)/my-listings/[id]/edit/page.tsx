"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  libyaCities, listingCategories, fuelTypes, transmissionTypes,
} from "@/lib/categories";

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/my-listings");
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "listings", params.id));
        if (!snap.exists()) {
          setError("الإعلان غير موجود.");
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as any) };
        if (data.ownerId !== user.uid) {
          setError("ليس لديك صلاحية تعديل هذا الإعلان.");
          setLoading(false);
          return;
        }
        setForm(data);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "تعذّر تحميل الإعلان.");
        setLoading(false);
      }
    };
    load();
  }, [params.id, user, authLoading, router]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !form) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      const features = (form.features || []).filter ? form.features : (form._featuresStr || "")
        .split(/[,\n،]/).map((s: string) => s.trim()).filter(Boolean);
      const defects = (form.defects || []).filter ? form.defects : (form._defectsStr || "")
        .split(/[,\n،]/).map((s: string) => s.trim()).filter(Boolean);

      await updateDoc(doc(db, "listings", params.id), {
        title: form.title?.trim() || "",
        category: form.category || "",
        brand: form.brand?.trim() || "",
        model: form.model?.trim() || "",
        color: form.color?.trim() || "",
        engine: form.engine?.trim() || "",
        price: Number(form.price) || 0,
        city: form.city || "",
        address: form.address?.trim() || "",
        mapLink: form.mapLink?.trim() || "",
        description: form.description?.trim() || "",
        phone: form.phone?.trim() || "",
        whatsapp: form.whatsapp?.trim() || "",
        sellerName: form.sellerName?.trim() || "",
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        features,
        defects,
        // إعادة المراجعة بعد أي تعديل
        status: "pending",
        rejectionReason: "",
        updatedAt: serverTimestamp(),
      });
      setMessage("تم حفظ التعديلات. سيتم إعادة مراجعة الإعلان.");
      setTimeout(() => router.push("/my-listings"), 1200);
    } catch (err: any) {
      setError(err?.message || "تعذّر حفظ التعديلات.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  if (error && !form) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-rose-700 font-bold">{error}</p>
          <button onClick={() => router.push("/my-listings")} className="btn-secondary mt-4">
            العودة
          </button>
        </div>
      </section>
    );
  }

  if (!form) return null;

  const featuresStr = Array.isArray(form.features)
    ? form.features.join("، ")
    : (form._featuresStr || "");
  const defectsStr = Array.isArray(form.defects)
    ? form.defects.join("، ")
    : (form._defectsStr || "");

  return (
    <section className="container py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="section-title">تعديل الإعلان</h1>
          <p className="section-subtitle">
            بعد التعديل سيُعاد إرسال الإعلان للمراجعة قبل النشر.
          </p>
        </div>

        {error && (
          <div className="card mb-4 border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="card mb-4 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4">
          <div>
            <label className="label">عنوان الإعلان</label>
            <input className="input" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
                {listingCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">السعر (د.ل)</label>
              <input className="input" type="number" value={form.price || ""} onChange={(e) => set("price", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">الماركة</label>
              <input className="input" value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div>
              <label className="label">الموديل</label>
              <input className="input" value={form.model || ""} onChange={(e) => set("model", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">السنة</label>
              <input className="input" type="number" value={form.year || ""} onChange={(e) => set("year", e.target.value)} />
            </div>
            <div>
              <label className="label">العداد</label>
              <input className="input" type="number" value={form.mileage || ""} onChange={(e) => set("mileage", e.target.value)} />
            </div>
            <div>
              <label className="label">اللون</label>
              <input className="input" value={form.color || ""} onChange={(e) => set("color", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">الوقود</label>
              <select className="input" value={form.fuel || "بنزين"} onChange={(e) => set("fuel", e.target.value)}>
                {fuelTypes.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ناقل الحركة</label>
              <select className="input" value={form.transmission || "أوتوماتيك"} onChange={(e) => set("transmission", e.target.value)}>
                {transmissionTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">المدينة</label>
              <select className="input" value={form.city || ""} onChange={(e) => set("city", e.target.value)}>
                {libyaCities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">العنوان المختصر</label>
              <input className="input" value={form.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">رابط الموقع</label>
            <input className="input" dir="ltr" value={form.mapLink || ""} onChange={(e) => set("mapLink", e.target.value)} />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea className="input min-h-[140px]" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">المميزات (افصلها بفاصلة)</label>
              <textarea
                className="input min-h-[80px]"
                value={featuresStr}
                onChange={(e) => {
                  set("_featuresStr", e.target.value);
                  set("features", e.target.value.split(/[,\n،]/).map((s) => s.trim()).filter(Boolean));
                }}
              />
            </div>
            <div>
              <label className="label">العيوب (افصلها بفاصلة)</label>
              <textarea
                className="input min-h-[80px]"
                value={defectsStr}
                onChange={(e) => {
                  set("_defectsStr", e.target.value);
                  set("defects", e.target.value.split(/[,\n،]/).map((s) => s.trim()).filter(Boolean));
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">اسم المعلن</label>
              <input className="input" value={form.sellerName || ""} onChange={(e) => set("sellerName", e.target.value)} />
            </div>
            <div>
              <label className="label">الهاتف</label>
              <input className="input" dir="ltr" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" className="btn-secondary" onClick={() => router.push("/my-listings")}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
