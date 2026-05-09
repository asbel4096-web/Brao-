"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ImagePlus,
  Loader2,
  Tag,
  X,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  fuelTypes,
  libyaCities,
  listingCategories,
  transmissionTypes,
} from "@/lib/categories";
import { formatPrice, normalizeLibyanPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FormState {
  title: string;
  category: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  engine: string;
  transmission: string;
  fuel: string;
  mileage: string;
  price: string;
  city: string;
  address: string;
  mapLink: string;
  description: string;
  sellerName: string;
  phone: string;
  whatsapp: string;
  features: string;
  defects: string;
}

const initialState: FormState = {
  title: "",
  category: "سيارات",
  brand: "",
  model: "",
  year: "",
  color: "",
  engine: "",
  transmission: "أوتوماتيك",
  fuel: "بنزين",
  mileage: "",
  price: "",
  city: "طرابلس",
  address: "",
  mapLink: "",
  description: "",
  sellerName: "",
  phone: "",
  whatsapp: "",
  features: "",
  defects: "",
};

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const TOTAL_STEPS = 4;

const STEP_LABELS = [
  { n: 1, title: "الصور والسعر", short: "الأساسيات" },
  { n: 2, title: "مواصفات المركبة", short: "المواصفات" },
  { n: 3, title: "الوصف والموقع", short: "الوصف" },
  { n: 4, title: "التواصل والنشر", short: "التواصل" },
];

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

  const topRef = useRef<HTMLDivElement | null>(null);

  // Pre-fill من الملف الشخصي
  useEffect(() => {
    if (user) {
      setForm((p) => ({
        ...p,
        sellerName:
          p.sellerName || profile?.businessName || profile?.name || user.displayName || "",
        phone: p.phone || profile?.phone || user.phoneNumber || "",
        whatsapp:
          p.whatsapp || profile?.phone || user.phoneNumber || "",
      }));
    }
  }, [user, profile]);

  // Image previews
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  // Scroll للأعلى عند تغيير الخطوة
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ----------------------------------------------------------
   * Image handling
   * ---------------------------------------------------------- */
  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError("");
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      setError(
        `يمكنك رفع حتى ${MAX_IMAGES} صورة فقط (المتبقي: ${MAX_IMAGES - images.length}).`
      );
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

  const moveImageToFirst = (i: number) => {
    if (i === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(i, 1);
      next.unshift(moved);
      return next;
    });
  };

  const wa = useMemo(
    () => normalizeLibyanPhone(form.whatsapp || form.phone || ""),
    [form.whatsapp, form.phone]
  );

  /* ----------------------------------------------------------
   * التحقق من كل خطوة
   * ---------------------------------------------------------- */
  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.title.trim()) return "اكتب عنوان الإعلان.";
      if (!form.category) return "اختر القسم.";
      if (!form.price.trim()) return "اكتب السعر.";
      if (Number(form.price) <= 0) return "السعر يجب أن يكون أكبر من صفر.";
      if (images.length === 0) return "أضف صورة واحدة على الأقل.";
    }
    if (s === 3) {
      if (!form.description.trim()) return "اكتب وصف الإعلان.";
      if (!form.city) return "اختر المدينة.";
    }
    if (s === 4) {
      if (!form.phone.trim()) return "اكتب رقم الهاتف.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goPrev = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  /* ----------------------------------------------------------
   * النشر
   * ---------------------------------------------------------- */
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("يجب تسجيل الدخول أولاً.");
      return;
    }

    // Triple auth guard لتفادي 403 من Firebase Storage
    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      setError("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      return;
    }

    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }

    try {
      setSubmitting(true);

      // رفع الصور
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const f = images[i];
        const safe = f.name.replace(/\s+/g, "-").toLowerCase();
        const r = ref(
          storage,
          `listing-images/${user.uid}/${Date.now()}-${i + 1}-${safe}`
        );
        await uploadBytes(r, f, { contentType: f.type });
        const url = await getDownloadURL(r);
        imageUrls.push(url);
      }

      const features = form.features
        .split(/[,\n،]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const defects = form.defects
        .split(/[,\n،]/)
        .map((s) => s.trim())
        .filter(Boolean);

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
          profile?.businessName ||
          profile?.name ||
          user.displayName ||
          "مستخدم براتشو كار",
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        features,
        defects,
        images: imageUrls,
        ownerId: user.uid,
        ownerEmail: user.email || "",
        status: "pending",
        featured: false,
        views: 0,
        likesCount: 0,
        commentsCount: 0,
        favoritesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("تم نشر إعلانك بنجاح! سيظهر للعموم بعد مراجعة المشرف.");
      reset();
      setTimeout(() => router.push("/my-listings"), 1500);
    } catch (err: any) {
      console.error("add listing", err);
      const code: string = err?.code || "";
      let message = err?.message || "حدث خطأ أثناء حفظ الإعلان.";
      if (code === "storage/unauthorized" || code === "permission-denied") {
        message = "صلاحية الرفع مرفوضة. تأكد من قواعد Firebase Storage.";
      } else if (code === "storage/unauthenticated") {
        message = "انتهت جلستك. يُرجى تسجيل الدخول من جديد.";
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------
   * Loading & guards
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <section className="container py-4 sm:py-8" ref={topRef}>
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        {/* العنوان */}
        <div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            إضافة إعلان
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            خطوة {step} من {TOTAL_STEPS} —{" "}
            <span className="font-bold text-brand-700 dark:text-brand-300">
              {STEP_LABELS[step - 1].title}
            </span>
          </p>
        </div>

        {/* Stepper - مدمج وموبايل first */}
        <Stepper currentStep={step} onStepClick={(n) => n < step && setStep(n)} />

        {/* رسائل الحالة */}
        {error && (
          <div
            className="
              flex items-start gap-2 rounded-2xl border border-rose-200
              bg-rose-50 p-3 text-sm font-bold text-rose-700
              dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300
            "
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div
            className="
              flex items-start gap-2 rounded-2xl border border-emerald-200
              bg-emerald-50 p-3 text-sm font-bold text-emerald-700
              dark:border-emerald-800 dark:bg-emerald-950/30
              dark:text-emerald-300
            "
          >
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ============ Step 1: الصور + الأساسيات ============ */}
          {step === 1 && (
            <div className="card animate-fade-in space-y-5 p-4 sm:p-6">
              {/* الصور أولاً (أهم بصرياً) */}
              <div>
                <Label
                  required
                  hint={`${images.length}/${MAX_IMAGES}`}
                >
                  صور الإعلان
                </Label>

                {previews.length === 0 ? (
                  <ImageUploadDropzone onChange={handleImages} />
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {previews.map((src, i) => (
                        <div
                          key={i}
                          className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`preview-${i}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 left-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition active:scale-90"
                            aria-label="حذف"
                          >
                            <X size={14} />
                          </button>
                          {i === 0 ? (
                            <span className="absolute bottom-1 right-1 rounded-full bg-action-500 px-2 py-0.5 text-[9px] font-black text-white">
                              الرئيسية
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveImageToFirst(i)}
                              className="absolute bottom-1 right-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-white transition active:scale-95"
                            >
                              ↑ رئيسية
                            </button>
                          )}
                        </div>
                      ))}

                      {images.length < MAX_IMAGES && (
                        <label
                          className="
                            flex aspect-square cursor-pointer items-center justify-center
                            rounded-2xl border-2 border-dashed border-slate-300
                            bg-slate-50 transition hover:border-brand-400
                            hover:bg-brand-50/30
                            dark:border-slate-700 dark:bg-slate-800
                            dark:hover:border-brand-700
                          "
                        >
                          <ImagePlus
                            size={20}
                            className="text-slate-400"
                            aria-hidden="true"
                          />
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImages}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      أول صورة هي الصورة الرئيسية. اضغط ↑ لتغيير الصورة الرئيسية.
                    </p>
                  </div>
                )}
              </div>

              {/* عنوان + قسم */}
              <div>
                <Label required>عنوان الإعلان</Label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="مثال: هونداي سبورتاج 2020 ممتازة"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {form.title.length}/100
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label required>القسم</Label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    {listingCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label required>السعر (د.ل)</Label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="65000"
                    min={0}
                  />
                  {form.price && Number(form.price) > 0 && (
                    <p className="mt-1 text-xs font-bold text-brand-700 dark:text-brand-300">
                      ≈ {formatPrice(Number(form.price))}
                    </p>
                  )}
                </div>
              </div>

              <NavButtons onNext={goNext} step={step} />
            </div>
          )}

          {/* ============ Step 2: مواصفات المركبة ============ */}
          {step === 2 && (
            <div className="card animate-fade-in space-y-5 p-4 sm:p-6">
              <SectionHeader
                title="مواصفات المركبة"
                hint="اترك ما لا ينطبق فارغاً (اختياري)"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>الماركة</Label>
                  <input
                    className="input"
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="هونداي"
                  />
                </div>
                <div>
                  <Label>الموديل</Label>
                  <input
                    className="input"
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="سبورتاج"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>سنة الصنع</Label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={form.year}
                    onChange={(e) => set("year", e.target.value)}
                    placeholder="2020"
                  />
                </div>
                <div>
                  <Label>اللون</Label>
                  <input
                    className="input"
                    value={form.color}
                    onChange={(e) => set("color", e.target.value)}
                    placeholder="أبيض"
                  />
                </div>
                <div>
                  <Label>المحرك</Label>
                  <input
                    className="input"
                    value={form.engine}
                    onChange={(e) => set("engine", e.target.value)}
                    placeholder="2.0L"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>المسافة المقطوعة (كم)</Label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={form.mileage}
                    onChange={(e) => set("mileage", e.target.value)}
                    placeholder="120000"
                  />
                </div>
                <div>
                  <Label>نوع الوقود</Label>
                  <select
                    className="input"
                    value={form.fuel}
                    onChange={(e) => set("fuel", e.target.value)}
                  >
                    {fuelTypes.map((f) => (
                      <option key={f}>{f}</option>
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
                    {transmissionTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <NavButtons onNext={goNext} onPrev={goPrev} step={step} />
            </div>
          )}

          {/* ============ Step 3: الوصف + الموقع ============ */}
          {step === 3 && (
            <div className="card animate-fade-in space-y-5 p-4 sm:p-6">
              <SectionHeader title="وصف الإعلان والموقع" />

              <div>
                <Label required>الوصف</Label>
                <textarea
                  className="input min-h-[140px] resize-y"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="اكتب الحالة، المواصفات، الميزات وأي معلومات مهمة للمشتري..."
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {form.description.length}/2000
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label hint="افصلها بفاصلة">المميزات</Label>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={form.features}
                    onChange={(e) => set("features", e.target.value)}
                    placeholder="فل أبشن، شاشة، كاميرا، فتحة سقف"
                  />
                </div>
                <div>
                  <Label hint="افصلها بفاصلة">عيوب وملاحظات</Label>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={form.defects}
                    onChange={(e) => set("defects", e.target.value)}
                    placeholder="خدش بسيط في المصد"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label required>المدينة</Label>
                  <select
                    className="input"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  >
                    {libyaCities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>العنوان المختصر</Label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="عين زارة - بجانب جامع..."
                  />
                </div>
              </div>

              <div>
                <Label hint="اختياري">رابط Google Maps</Label>
                <input
                  className="input"
                  dir="ltr"
                  value={form.mapLink}
                  onChange={(e) => set("mapLink", e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>

              <NavButtons onNext={goNext} onPrev={goPrev} step={step} />
            </div>
          )}

          {/* ============ Step 4: التواصل + الملخص ============ */}
          {step === 4 && (
            <div className="card animate-fade-in space-y-5 p-4 sm:p-6">
              <SectionHeader title="التواصل والنشر" />

              <div>
                <Label hint="نشاطك التجاري أو اسمك">اسم المعلن</Label>
                <input
                  className="input"
                  value={form.sellerName}
                  onChange={(e) => set("sellerName", e.target.value)}
                  placeholder="اسمك أو نشاطك التجاري"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label required>رقم الهاتف</Label>
                  <input
                    className="input"
                    dir="ltr"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <Label hint="إذا كان مختلف">واتساب</Label>
                  <input
                    className="input"
                    dir="ltr"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value)}
                    placeholder="0912345678"
                  />
                </div>
              </div>

              {/* Summary preview */}
              <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/30">
                <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-black text-brand-800 dark:text-brand-200">
                  <Tag size={14} />
                  ملخص الإعلان
                </h4>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  <SummaryRow label="العنوان" value={form.title} />
                  <SummaryRow label="القسم" value={form.category} />
                  <SummaryRow
                    label="السعر"
                    value={form.price ? formatPrice(Number(form.price)) : "—"}
                  />
                  <SummaryRow label="المدينة" value={form.city} />
                  <SummaryRow
                    label="الصور"
                    value={`${images.length} صورة`}
                  />
                </ul>
              </div>

              {/* أزرار */}
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="btn-secondary !px-4"
                  disabled={submitting}
                >
                  <ChevronRight size={16} />
                  السابق
                </button>
                <button
                  type="submit"
                  className="btn-action"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جارٍ النشر...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      نشر الإعلان
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

/* ============================================================
 * Stepper - متجاوب وأنظف
 * ============================================================ */
function Stepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (n: number) => void;
}) {
  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      {/* شريط التقدم */}
      <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-brand-700 to-brand-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* النقاط */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((s) => {
          const done = currentStep > s.n;
          const active = currentStep === s.n;
          const clickable = s.n < currentStep;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => clickable && onStepClick(s.n)}
              disabled={!clickable && !active}
              className={cn(
                "flex flex-col items-center gap-1 transition",
                clickable && "cursor-pointer hover:opacity-80"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition",
                  done && "bg-brand-700 text-white",
                  active && "bg-brand-700 text-white ring-4 ring-brand-100 dark:ring-brand-900/40",
                  !done && !active && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {done ? <CheckCircle size={15} /> : s.n}
              </span>
              <span
                className={cn(
                  "hidden text-[11px] font-bold sm:block",
                  active
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {s.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */
function Label({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
      <span>
        {children}
        {required && <span className="mx-1 text-rose-600">*</span>}
      </span>
      {hint && (
        <span className="text-[10px] font-normal text-slate-400">{hint}</span>
      )}
    </label>
  );
}

function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">
        {title}
      </h2>
      {hint && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function NavButtons({
  onNext,
  onPrev,
  step,
}: {
  onNext: () => void;
  onPrev?: () => void;
  step: number;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
      {onPrev ? (
        <button
          type="button"
          onClick={onPrev}
          className="btn-secondary !px-4"
        >
          <ChevronRight size={16} />
          السابق
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        className="btn-primary"
      >
        التالي
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

function ImageUploadDropzone({
  onChange,
}: {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className="
        flex cursor-pointer flex-col items-center justify-center gap-2
        rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50
        p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/30
        dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700
      "
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Camera size={24} />
      </div>
      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
        اضغط لاختيار الصور
      </span>
      <span className="text-xs text-slate-500">
        أول صورة هي الرئيسية. حد أقصى {MAX_IMAGES} صورة، 10 ميجابايت لكل صورة.
      </span>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate font-black text-slate-900 dark:text-white">
        {value || "—"}
      </span>
    </li>
  );
}
