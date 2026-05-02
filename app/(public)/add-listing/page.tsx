"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera, X, CheckCircle, AlertCircle } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  libyaCities, listingCategories, fuelTypes, transmissionTypes,
} from "@/lib/categories";
import { normalizeLibyanPhone } from "@/lib/utils";

interface FormState {
  title: string; category: string; brand: string; model: string;
  year: string; color: string; engine: string;
  transmission: string; fuel: string; mileage: string;
  price: string; city: string; address: string; mapLink: string;
  description: string; sellerName: string; phone: string; whatsapp: string;
  features: string; defects: string;
}

const initialState: FormState = {
  title: "", category: "سيارات", brand: "", model: "",
  year: "", color: "", engine: "",
  transmission: "أوتوماتيك", fuel: "بنزين", mileage: "",
  price: "", city: "طرابلس", address: "", mapLink: "",
  description: "", sellerName: "", phone: "", whatsapp: "",
  features: "", defects: "",
};

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function AddListingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  // Pre-fill from profile
  useEffect(() => {
    if (user) {
      setForm((p) => ({
        ...p,
        sellerName: p.sellerName || profile?.name || user.displayName || "",
        phone: p.phone || profile?.phone || user.phoneNumber || "",
        whatsapp: p.whatsapp || profile?.phone || user.phoneNumber || "",
      }));
    }
  }, [user, profile]);

  // Image previews
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError("");
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      setError(`يمكنك رفع حتى ${MAX_IMAGES} صورة فقط (المتبقي: ${MAX_IMAGES - images.length}).`);
      e.target.value = "";
      return;
    }
    const invalid = files.find(
      (f) => !f.type.startsWith("image/") || f.size > MAX_IMAGE_SIZE
    );
    if (invalid) {
      setError("كل الملفات يجب أن تكون صوراً أقل من 10 ميجابايت.");
      e.target.value = "";
      return;
    }
    setImages((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const wa = useMemo(
    () => normalizeLibyanPhone(form.whatsapp || form.phone || ""),
    [form.whatsapp, form.phone]
  );

  const reset = () => {
    setForm({
      ...initialState,
      sellerName: form.sellerName,
      phone: form.phone,
      whatsapp: form.whatsapp,
    });
    setImages([]);
    setStep(1);
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.title.trim()) return "اكتب عنوان الإعلان.";
      if (!form.category) return "اختر القسم.";
      if (!form.price.trim()) return "اكتب السعر.";
    }
    if (s === 2) {
      if (!form.description.trim()) return "اكتب وصف الإعلان.";
      if (!form.city) return "اختر المدينة.";
    }
    if (s === 3) {
      if (!form.phone.trim()) return "اكتب رقم الهاتف.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!user) {
      setError("يجب تسجيل الدخول أولاً.");
      return;
    }
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Upload images first
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const f = images[i];
        const safe = f.name.replace(/\s+/g, "-");
        const r = ref(storage, `listing-images/${user.uid}/${Date.now()}-${i + 1}-${safe}`);
        await uploadBytes(r, f, { contentType: f.type });
        const url = await getDownloadURL(r);
        imageUrls.push(url);
      }

      const features = form.features
        .split(/[,\n،]/).map((s) => s.trim()).filter(Boolean);
      const defects = form.defects
        .split(/[,\n،]/).map((s) => s.trim()).filter(Boolean);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        brand: form.brand.trim(),
        model: form.model.trim(),
        color: form.color.trim(),
        engine: form.engine.trim(),
        price: Number(form.price) || 0,
        city: form.city,
        address: form.address.trim(),
        mapLink: form.mapLink.trim(),
        description: form.description.trim(),
        phone: form.phone.trim(),
        whatsapp: wa,
        sellerName:
          form.sellerName.trim() ||
          profile?.name ||
          user.displayName ||
          "مستخدم براتشو كار",
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        features, defects,
        images: imageUrls,
        ownerId: user.uid,
        ownerEmail: user.email || "",
        status: "pending",
        featured: false,
        views: 0,
        favoritesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("تم نشر إعلانك بنجاح! سيظهر للعموم بعد مراجعة المشرف.");
      reset();
      setTimeout(() => router.push("/my-listings"), 1500);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("add listing", err);
      setError(err?.message || "حدث خطأ أثناء حفظ الإعلان.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <h1 className="section-title">إضافة إعلان</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            يجب تسجيل الدخول حتى تتمكن من إضافة إعلان جديد.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/add-listing")}
            className="btn-primary mt-6"
          >
            تسجيل الدخول
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">
            أكمل الخطوات الثلاث وسيتم مراجعة إعلانك خلال 24 ساعة.
          </p>
        </div>

        {/* Stepper */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            {[
              { n: 1, label: "بيانات أساسية" },
              { n: 2, label: "تفاصيل الإعلان" },
              { n: 3, label: "التواصل والصور" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition ${
                    step >= s.n
                      ? "bg-brand-700 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  {step > s.n ? <CheckCircle size={18} /> : s.n}
                </div>
                <div className="mx-2 flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {s.label}
                </div>
                {i < arr.length - 1 && (
                  <div className={`h-0.5 flex-1 ${step > s.n ? "bg-brand-700" : "bg-slate-200 dark:bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="card flex items-start gap-2 border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="card flex items-start gap-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="card p-5 sm:p-6 space-y-4 animate-fade-in">
              <h2 className="text-xl font-black dark:text-white">بيانات أساسية</h2>
              <div>
                <label className="label">عنوان الإعلان *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="مثال: هونداي سبورتاج 2020 ممتازة"
                  maxLength={100}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">القسم *</label>
                  <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {listingCategories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">السعر (د.ل) *</label>
                  <input
                    className="input"
                    type="number"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="65000"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">الماركة</label>
                  <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="هونداي" />
                </div>
                <div>
                  <label className="label">الموديل</label>
                  <input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="سبورتاج" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">سنة الصنع</label>
                  <input className="input" type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2020" />
                </div>
                <div>
                  <label className="label">اللون</label>
                  <input className="input" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="أبيض" />
                </div>
                <div>
                  <label className="label">المحرك</label>
                  <input className="input" value={form.engine} onChange={(e) => set("engine", e.target.value)} placeholder="2.0L" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={goNext} className="btn-primary">التالي ←</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="card p-5 sm:p-6 space-y-4 animate-fade-in">
              <h2 className="text-xl font-black dark:text-white">تفاصيل الإعلان</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">المسافة المقطوعة</label>
                  <input className="input" type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} placeholder="120000" />
                </div>
                <div>
                  <label className="label">نوع الوقود</label>
                  <select className="input" value={form.fuel} onChange={(e) => set("fuel", e.target.value)}>
                    {fuelTypes.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">ناقل الحركة</label>
                  <select className="input" value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
                    {transmissionTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">الوصف *</label>
                <textarea
                  className="input min-h-[150px] resize-y"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="اكتب الحالة، المواصفات، الميزات وأي معلومات مهمة للمشتري..."
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-slate-500">{form.description.length}/2000</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">المميزات (افصلها بفاصلة)</label>
                  <textarea className="input min-h-[80px]" value={form.features} onChange={(e) => set("features", e.target.value)} placeholder="فل أبشن، شاشة، كاميرا" />
                </div>
                <div>
                  <label className="label">عيوب وملاحظات (افصلها بفاصلة)</label>
                  <textarea className="input min-h-[80px]" value={form.defects} onChange={(e) => set("defects", e.target.value)} placeholder="خدش بسيط في المصد" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">المدينة *</label>
                  <select className="input" value={form.city} onChange={(e) => set("city", e.target.value)}>
                    {libyaCities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">العنوان المختصر</label>
                  <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="عين زارة - بجانب جامع..." />
                </div>
              </div>
              <div>
                <label className="label">رابط Google Maps (اختياري)</label>
                <input className="input" dir="ltr" value={form.mapLink} onChange={(e) => set("mapLink", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">→ السابق</button>
                <button type="button" onClick={goNext} className="btn-primary">التالي ←</button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="card p-5 sm:p-6 space-y-4 animate-fade-in">
              <h2 className="text-xl font-black dark:text-white">التواصل والصور</h2>
              <div>
                <label className="label">اسم المعلن</label>
                <input className="input" value={form.sellerName} onChange={(e) => set("sellerName", e.target.value)} placeholder="اسمك أو نشاطك التجاري" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">رقم الهاتف *</label>
                  <input className="input" dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0912345678" />
                </div>
                <div>
                  <label className="label">واتساب (اختياري)</label>
                  <input className="input" dir="ltr" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="0912345678" />
                </div>
              </div>

              <div>
                <label className="label">صور الإعلان (حتى {MAX_IMAGES} صورة)</label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800">
                  <Camera size={32} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    اضغط لاختيار الصور أو اسحبها هنا
                  </span>
                  <span className="text-xs text-slate-500">حتى 10 ميجابايت لكل صورة</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImages}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  المختار: <strong>{images.length}</strong> / {MAX_IMAGES}
                </p>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`preview-${i}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 left-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label="حذف"
                      >
                        <X size={14} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 right-1 rounded-full bg-action-500 px-2 py-0.5 text-[10px] font-black text-white">
                          الرئيسية
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">→ السابق</button>
                <button type="submit" className="btn-action" disabled={submitting}>
                  {submitting ? "جارٍ النشر..." : "نشر الإعلان"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
