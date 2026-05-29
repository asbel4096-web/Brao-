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
  MapPin,
  ShieldCheck,
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
  getAddListingConfig,
} from "@/lib/categories";
import { formatPrice, normalizeLibyanPhone } from "@/lib/utils";
import { applyBratshoWatermark } from "@/lib/image-watermark";
import { cn } from "@/lib/utils";
import { useBannedWordsCheck } from "@/hooks/admin/use-banned-words-check";

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
  // حقول خاصة بالساحبات - تُملأ فقط عند اختيار "ساحبة سيارات".
  area: string;
  coverageAreas: string;
  availableNow: boolean;
  latitude: string;
  longitude: string;
  locationUrl: string;
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
  area: "",
  coverageAreas: "",
  availableNow: true,
  latitude: "",
  longitude: "",
  locationUrl: "",
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
  // فحص الكلمات المحظورة. يطبَّق على العنوان + الوصف قبل الإرسال.
  const { check: checkBannedWords } = useBannedWordsCheck();

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

  // helper منفصل للحقول boolean (مثل availableNow في خدمات الساحبات).
  const setBool = (k: keyof FormState, v: boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  // إعدادات النموذج حسب القسم المختار: نص إرشادي + إظهار حقول المركبة +
  // نوع الكيان المخزَّن. لا يغيّر التصميم — فقط يظهر/يخفي مجموعات موجودة.
  const categoryConfig = getAddListingConfig(form.category);

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

    // فحص الكلمات المحظورة في العنوان والوصف. severity="block" يمنع
    // النشر تماماً. نفحص الحقلين معاً ونُرجع أول مطابقة.
    const titleHit = checkBannedWords(form.title);
    if (titleHit && titleHit.severity === "block") {
      setError(`عنوان الإعلان يحوي كلمة غير مسموحة: "${titleHit.matchedWord}".`);
      setStep(1);
      return;
    }
    const descHit = checkBannedWords(form.description);
    if (descHit && descHit.severity === "block") {
      setError(`وصف الإعلان يحوي كلمة غير مسموحة: "${descHit.matchedWord}".`);
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);

      // رفع الصور - مع دمج شعار براتشو كار تلقائياً قبل الرفع
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const original = images[i];
        // دمج العلامة المائية. إن فشل لأي سبب يُعاد الملف الأصلي.
        const stamped = await applyBratshoWatermark(original);
        const safe = stamped.name.replace(/\s+/g, "-").toLowerCase();
        const r = ref(
          storage,
          `listing-images/${user.uid}/${Date.now()}-${i + 1}-${safe}`
        );
        await uploadBytes(r, stamped, { contentType: stamped.type });
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

      const ownerName =
        profile?.businessName ||
        profile?.name ||
        user.displayName ||
        "مستخدم براتشو كار";
      const ownerAvatar = profile?.photoURL || user.photoURL || "";

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
        ownerName,
        ownerAvatar,
        ownerEmail: user.email || "",
        // نوع الكيان مشتق من مجموعة القسم المختار (خدمات => service،
        // غير ذلك => listing) حتى تنقسم الإعلانات والخدمات بشكل صحيح.
        entityType: categoryConfig.entityType,
        // حقول إضافية للساحبات - تُحفظ فقط لما القسم يدعمها (شرط
        // showTowTruckFields). نُرسل القيم دائماً (بقيم افتراضية فارغة)
        // عندما القسم ساحبة، حتى تكون متاحة للقراءة لاحقاً.
        ...(categoryConfig.showTowTruckFields
          ? {
              availableNow: form.availableNow === true,
              area: form.area.trim(),
              coverageAreas: form.coverageAreas.trim(),
              locationUrl: form.locationUrl.trim(),
              latitude: form.latitude ? Number(form.latitude) : null,
              longitude: form.longitude ? Number(form.longitude) : null,
            }
          : {}),
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

              {/* نص إرشادي يتغيّر حسب القسم المختار */}
              <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3 text-xs leading-6 font-bold text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-200">
                {categoryConfig.helper}
              </div>

              <NavButtons onNext={goNext} step={step} />
            </div>
          )}

          {/* ============ Step 2: مواصفات المركبة ============ */}
          {step === 2 && (
            <div className="card animate-fade-in space-y-5 p-4 sm:p-6">
              {/* العنوان العام يظهر فقط للأقسام التي ليست ساحبة سيارات.
                  الساحبة لها قسم خاص (TowTruckFieldsSection) بعنوانه الخاص،
                  لذا نتجنّب الازدواج. */}
              {!categoryConfig.showTowTruckFields && (
                <SectionHeader
                  title={
                    categoryConfig.showVehicleSpecs
                      ? "مواصفات المركبة"
                      : "تفاصيل إضافية"
                  }
                  hint={
                    categoryConfig.showVehicleSpecs
                      ? "اترك ما لا ينطبق فارغاً (اختياري)"
                      : "هذا القسم لا يحتاج مواصفات مركبة"
                  }
                />
              )}

              {categoryConfig.showVehicleSpecs ? (
                <>
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
                </>
              ) : !categoryConfig.showTowTruckFields ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  لا حاجة لمواصفات مركبة في هذا القسم. تابع لإضافة الوصف
                  والصور وبيانات التواصل في الخطوات التالية.
                </div>
              ) : null}

              {/* ============ قسم خاص بخدمة الساحبات ============
                  يظهر فقط عند اختيار "ساحبة سيارات".
                  يحوي: المنطقة، المناطق المغطاة، toggle "متاح الآن"،
                  زر "استخدم موقعي الحالي كموقع الخدمة"، رابط الخريطة. */}
              {categoryConfig.showTowTruckFields && (
                <TowTruckFieldsSection
                  form={form}
                  set={set}
                  setBool={setBool}
                />
              )}

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

/* ============================================================
 * TowTruckFieldsSection
 *
 * قسم يظهر فقط لخدمات الساحبات في الخطوة 2.
 * يحوي حقولاً خاصة بهذا النوع من الخدمات:
 *  - المنطقة داخل المدينة (area)
 *  - المناطق المغطاة (coverageAreas - نص حر)
 *  - toggle "متاح الآن"
 *  - زر "استخدم موقعي الحالي" للحصول على إحداثيات الخدمة
 *  - latitude/longitude للعرض/التعديل اليدوي
 *  - locationUrl - رابط Google Maps اختياري
 *
 * عن الإحداثيات: يستخدم Browser Geolocation API. الموقع الذي يلتقطه
 * صاحب الخدمة هنا هو موقع *الخدمة الثابت* (موقع مكتبه/سيارته الأساسي)،
 * ليس موقعه الحالي كمستخدم. يُحفظ في Firestore. كل عملية إنشاء/تعديل
 * طوعية ومُبدأة بنقرة المالك.
 * ============================================================ */
function TowTruckFieldsSection({
  form,
  set,
  setBool,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  setBool: (k: keyof FormState, v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [locError, setLocError] = useState("");

  const handleUseMyLocation = () => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setLocError("جهازك لا يدعم تحديد الموقع.");
      return;
    }
    setBusy(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        if (err.code === 1) {
          setLocError("لم يتم السماح بالوصول للموقع.");
        } else if (err.code === 2) {
          setLocError("تعذّر تحديد الموقع. تأكد من تفعيل GPS.");
        } else {
          setLocError("حدث خطأ أثناء تحديد الموقع.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-action-200 bg-action-50/40 p-4 dark:border-action-800/40 dark:bg-action-900/10">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-action-600 dark:text-action-300">⚡</div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            تفاصيل خدمة الساحبة
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
            ساعد المستخدمين على إيجاد ساحبتك بسرعة عند الحاجة.
          </p>
        </div>
      </div>

      {/* الحالة + المنطقة */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>المنطقة داخل المدينة</Label>
          <input
            className="input"
            value={form.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="حي الأندلس، طريق المطار..."
            maxLength={80}
          />
        </div>

        <div>
          <Label>متاح الآن للاستلام؟</Label>
          <button
            type="button"
            onClick={() => setBool("availableNow", !form.availableNow)}
            className={`flex h-11 w-full items-center justify-between rounded-2xl border px-3 text-sm font-black transition active:scale-[0.99] ${
              form.availableNow
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            <span>
              {form.availableNow ? "نعم، متاح الآن" : "غير متاح حالياً"}
            </span>
            <span
              aria-hidden="true"
              className={`relative inline-block h-6 w-11 rounded-full transition ${
                form.availableNow ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                  form.availableNow ? "right-0.5" : "right-5"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* المناطق التي تغطيها */}
      <div>
        <Label hint="نص حر يصف نطاق التغطية">
          المناطق التي تغطيها
        </Label>
        <textarea
          className="input min-h-[70px] resize-y"
          value={form.coverageAreas}
          onChange={(e) => set("coverageAreas", e.target.value)}
          placeholder="مثال: طرابلس، عين زارة، تاجوراء، السواني..."
          maxLength={300}
        />
        <p className="mt-1 text-[10px] text-slate-500">
          {form.coverageAreas.length}/300
        </p>
      </div>

      {/* الإحداثيات + زر استخدم موقعي */}
      <div className="space-y-2">
        <Label hint="يظهر المسافة للمستخدمين القريبين">
          موقع الخدمة (اختياري)
        </Label>
        <p className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <ShieldCheck size={10} />
          الموقع الذي تلتقطه يُحفظ كموقع ثابت لخدمتك (مكتبك أو سيارتك).
        </p>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={busy}
          className="
            inline-flex h-11 w-full items-center justify-center gap-1.5
            rounded-2xl border border-action-300 bg-white text-sm font-black
            text-action-700 transition active:scale-95 hover:bg-action-50
            disabled:opacity-60
            dark:border-action-800/40 dark:bg-slate-900 dark:text-action-300
            dark:hover:bg-action-900/20
          "
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MapPin size={16} />
          )}
          {busy ? "جارٍ تحديد الموقع..." : "استخدم موقعي الحالي كموقع الخدمة"}
        </button>

        {locError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-300">{locError}</p>
        )}

        {(form.latitude || form.longitude) && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>خط العرض (latitude)</Label>
              <input
                className="input"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                placeholder="32.880000"
                inputMode="decimal"
                dir="ltr"
              />
            </div>
            <div>
              <Label>خط الطول (longitude)</Label>
              <input
                className="input"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                placeholder="13.180000"
                inputMode="decimal"
                dir="ltr"
              />
            </div>
          </div>
        )}

        <div>
          <Label hint="رابط من Google Maps">
            رابط الموقع على الخريطة (اختياري)
          </Label>
          <input
            className="input"
            value={form.locationUrl}
            onChange={(e) => set("locationUrl", e.target.value)}
            placeholder="https://maps.google.com/..."
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}
