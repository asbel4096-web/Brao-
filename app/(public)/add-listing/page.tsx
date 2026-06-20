"use client";

import {
  ChangeEvent,
  FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  AlertCircle,
  CheckCircle,
  Check,
  ChevronLeft,
  FileText,
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Tag,
  Car,
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
import { enhanceImage } from "@/lib/image-enhance";
import { cn } from "@/lib/utils";
import { DynamicFields } from "@/components/categories/dynamic-fields";
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
  area: string;
  coverageAreas: string;
  availableNow: boolean;
  latitude: string;
  longitude: string;
  locationUrl: string;
  condition: string;
  compatibleCar: string;
  rating: string;
  // حقول الأقسام المتخصّصة (Dynamic Forms)
  seats: string;
  payload: string;
  voltage: string;
  usagePercent: string;
  capacity: string;
  oilBrand: string;
  oilType: string;
  tireSize: string;
  tireCount: string;
  truckType: string;
  towType: string;
  available24h: boolean;
  damageType: string;
  repairable: boolean;
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
  condition: "",
  compatibleCar: "",
  rating: "",
  seats: "",
  payload: "",
  voltage: "",
  usagePercent: "",
  capacity: "",
  oilBrand: "",
  oilType: "",
  tireSize: "",
  tireCount: "",
  truckType: "",
  towType: "",
  available24h: false,
  damageType: "",
  repairable: false,
};

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const DRAFT_KEY = "bratsho:addListingDraft";
const TOTAL_STEPS = 5;

// مواصفات شائعة تُعرض كـchips. القيمة المخزّنة تبقى نص features
// مفصول بفواصل (نفس ما يتوقعه منطق الحفظ - لا تغيير في البنية).
const FEATURE_CHIPS = [
  "مكيف",
  "كاميرا خلفية",
  "حساسات",
  "بلوتوث",
  "فتحة سقف",
  "مثبت سرعة",
  "تشغيل بصمة",
  "شاشة",
  "نظام ملاحة",
  "جنوط",
  "مقاعد جلد",
  "تحكم مقود",
];

const STEPS = [
  { n: 1, label: "الصور", icon: ImagePlus },
  { n: 2, label: "المعلومات", icon: Car },
  { n: 3, label: "التفاصيل", icon: FileText },
  { n: 4, label: "السعر", icon: Tag },
  { n: 5, label: "نشر الإعلان", icon: CheckCircle },
];

export default function AddListingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { check: checkBannedWords } = useBannedWordsCheck();

  const [form, setForm] = useState<FormState>(initialState);
  const [images, setImages] = useState<File[]>([]);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const topRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-fill من الملف الشخصي
  useEffect(() => {
    if (user) {
      setForm((p) => ({
        ...p,
        sellerName:
          p.sellerName || profile?.businessName || profile?.name || user.displayName || "",
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

  // استرجاع المسودة المحفوظة (مرّة واحدة عند الفتح). النصوص فقط — الصور
  // لا يمكن حفظها محلياً، فيُعاد إضافتها.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const meaningful =
        saved &&
        (saved.title || saved.brand || saved.model || saved.description || saved.price);
      if (meaningful) {
        setForm((p) => ({ ...p, ...saved }));
        setDraftRestored(true);
      }
    } catch {
      /* تجاهل */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ المسودة تلقائياً عند أي تغيير ذي معنى (نصوص فقط).
  useEffect(() => {
    if (typeof window === "undefined" || success) return;
    const hasContent =
      form.title || form.brand || form.model || form.description || form.price;
    try {
      if (hasContent) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      }
    } catch {
      /* تجاهل (مساحة ممتلئة/خاص) */
    }
  }, [form, success]);

  const clearDraft = () => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* تجاهل */
    }
  };

  const startFresh = () => {
    clearDraft();
    setForm((p) => ({
      ...initialState,
      sellerName: p.sellerName,
      phone: p.phone,
      whatsapp: p.whatsapp,
    }));
    setImages([]);
    setStep(1);
    setDraftRestored(false);
  };

  // Scroll للأعلى عند تغيير الخطوة
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setBool = (k: keyof FormState, v: boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const categoryConfig = getAddListingConfig(form.category);

  // المواصفات المختارة (مشتقّة من نص features)
  const selectedFeatures = useMemo(
    () =>
      form.features
        .split(/[,\n،]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [form.features]
  );

  const toggleFeature = (feat: string) => {
    const current = new Set(selectedFeatures);
    if (current.has(feat)) current.delete(feat);
    else current.add(feat);
    set("features", Array.from(current).join("، "));
  };

  /* ----------------------------------------------------------
   * Image handling
   * ---------------------------------------------------------- */
  const addFiles = (files: File[]) => {
    setError("");
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      setError(
        `يمكنك رفع حتى ${MAX_IMAGES} صورة فقط (المتبقي: ${MAX_IMAGES - images.length}).`
      );
      return;
    }
    const invalid = files.find(
      (f) => !f.type.startsWith("image/") || f.size > MAX_IMAGE_SIZE
    );
    if (invalid) {
      setError("كل الملفات يجب أن تكون صوراً أقل من 10 ميجابايت.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files || []));
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

  /* ----------------------------------------------------------
   * سحب الصور لإعادة الترتيب (Pointer Events — يعمل على اللمس والفأرة).
   * السحب يبدأ من مقبض السحب فقط كي لا يتعطّل تمرير الصفحة.
   * ---------------------------------------------------------- */
  const dragFrom = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const reorderImages = (from: number, to: number) => {
    setImages((prev) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= prev.length ||
        to >= prev.length
      )
        return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onDragHandleDown = (idx: number) => (e: ReactPointerEvent) => {
    dragFrom.current = idx;
    setDragOverIdx(idx);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* تجاهل */
    }
  };
  const onDragHandleMove = (e: ReactPointerEvent) => {
    if (dragFrom.current == null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest("[data-img-index]") as HTMLElement | null;
    if (cell) {
      const ti = Number(cell.dataset.imgIndex);
      if (!Number.isNaN(ti)) setDragOverIdx(ti);
    }
  };
  const onDragHandleUp = () => {
    const from = dragFrom.current;
    const to = dragOverIdx;
    dragFrom.current = null;
    setDragOverIdx(null);
    if (from != null && to != null) reorderImages(from, to);
  };

  const wa = useMemo(
    () => normalizeLibyanPhone(form.whatsapp || form.phone || ""),
    [form.whatsapp, form.phone]
  );

  /* ----------------------------------------------------------
   * التحقق من كل خطوة (5 خطوات الآن)
   *   1 الصور · 2 المعلومات · 3 التفاصيل · 4 السعر · 5 النشر
   * ---------------------------------------------------------- */
  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (images.length < 3) return "أضف 3 صور على الأقل.";
    }
    if (s === 2) {
      if (!form.title.trim()) return "اكتب عنوان الإعلان.";
      if (!form.category) return "اختر القسم.";
    }
    if (s === 3) {
      if (!form.description.trim()) return "اكتب وصف الإعلان.";
      if (!form.city) return "اختر المدينة.";
    }
    if (s === 4) {
      if (!form.price.trim()) return "اكتب السعر.";
      if (Number(form.price) <= 0) return "السعر يجب أن يكون أكبر من صفر.";
    }
    if (s === 5) {
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
   * النشر — منطق الحفظ محفوظ كما هو (Firebase Storage + Firestore)
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

    const titleHit = checkBannedWords(form.title);
    if (titleHit && titleHit.severity === "block") {
      setError(`عنوان الإعلان يحوي كلمة غير مسموحة: "${titleHit.matchedWord}".`);
      setStep(2);
      return;
    }
    const descHit = checkBannedWords(form.description);
    if (descHit && descHit.severity === "block") {
      setError(`وصف الإعلان يحوي كلمة غير مسموحة: "${descHit.matchedWord}".`);
      setStep(3);
      return;
    }

    try {
      setSubmitting(true);

      // رفع الصور - تحسين تلقائي (اختياري) ثم دمج شعار براتشو كار قبل الرفع
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const original = images[i];
        const prepared = autoEnhance ? await enhanceImage(original) : original;
        const stamped = await applyBratshoWatermark(prepared);
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
        entityType: categoryConfig.entityType,
        ...(form.condition ? { condition: form.condition } : {}),
        ...(form.compatibleCar.trim()
          ? { compatibleCar: form.compatibleCar.trim() }
          : {}),
        ...(form.rating ? { rating: Number(form.rating) || null } : {}),
        // حقول الأقسام المتخصّصة - تُحفظ فقط لو لها قيمة (لا حقل فارغ)
        ...(form.seats ? { seats: Number(form.seats) || null } : {}),
        ...(form.payload ? { payload: Number(form.payload) || null } : {}),
        ...(form.voltage.trim() ? { voltage: form.voltage.trim() } : {}),
        ...(form.usagePercent
          ? { usagePercent: Number(form.usagePercent) || null }
          : {}),
        ...(form.capacity.trim() ? { capacity: form.capacity.trim() } : {}),
        ...(form.oilBrand.trim() ? { oilBrand: form.oilBrand.trim() } : {}),
        ...(form.oilType.trim() ? { oilType: form.oilType.trim() } : {}),
        ...(form.tireSize.trim() ? { tireSize: form.tireSize.trim() } : {}),
        ...(form.tireCount
          ? { tireCount: Number(form.tireCount) || null }
          : {}),
        ...(form.truckType.trim() ? { truckType: form.truckType.trim() } : {}),
        ...(form.towType.trim() ? { towType: form.towType.trim() } : {}),
        ...(form.available24h ? { available24h: true } : {}),
        ...(form.damageType.trim()
          ? { damageType: form.damageType.trim() }
          : {}),
        ...(form.repairable ? { repairable: true } : {}),
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
      clearDraft();
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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-sm">
          جارٍ التحميل...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">إضافة إعلان</h1>
          <p className="mt-3 text-slate-600">
            يجب تسجيل الدخول حتى تتمكن من إضافة إعلان جديد.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/add-listing")}
            className="mt-6 rounded-2xl bg-brand-700 px-6 py-3 font-black text-white"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
   * Render — تصميم جديد (وضع نهاري، مطابق للمرجع)
   * ---------------------------------------------------------- */
  return (
    <div
      dir="rtl"
      ref={topRef}
      className="min-h-screen bg-[#F8FAFC]"
      style={{
        fontFamily: "inherit",
        // مساحة سفلية آمنة = شريط الأزرار (~64) + شريط التنقّل (~76) +
        // المساحة الآمنة للجهاز، كي لا يُغطّى آخر المحتوى ولا زر التالي.
        paddingBottom: "calc(150px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
        {/* العنوان */}
        <header className="mb-4">
          <h1 className="text-2xl font-black text-slate-900">أضف سيارة جديدة</h1>
          <p className="mt-1 text-sm text-slate-500">
            أكمل الخطوات لنشر إعلانك باحترافية
          </p>
        </header>

        {/* Stepper */}
        <Stepper currentStep={step} onStepClick={(n) => n < step && setStep(n)} />

        {/* رسائل الحالة */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
            >
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {draftRestored && !success && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <FileText size={16} className="shrink-0 text-brand-600 dark:text-brand-300" />
            <p className="flex-1 text-xs font-bold text-brand-800 dark:text-brand-200">
              تم استرجاع مسودتك السابقة. أعد إضافة الصور قبل النشر.
            </p>
            <button
              type="button"
              onClick={startFresh}
              className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-300 dark:ring-brand-800"
            >
              ابدأ من جديد
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* ============ Step 1: الصور ============ */}
              {step === 1 && (
                <Card title="صور السيارة" subtitle="أضف صوراً واضحة وجذابة لسيارتك">
                  <p className="mb-3 text-xs font-bold text-slate-400">
                    الحد الأدنى 3 صور · الأقصى {MAX_IMAGES} · حتى 10MB لكل صورة
                  </p>

                  {/* رفع رئيسي كبير + Drag&Drop */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                    className="hidden"
                  />

                  {previews.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={cn(
                        "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition",
                        dragOver
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 bg-slate-50 hover:border-brand-300"
                      )}
                    >
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg">
                        <ImagePlus size={28} />
                      </div>
                      <span className="text-base font-black text-slate-700">
                        اضغط لإضافة الصورة الرئيسية
                      </span>
                      <span className="text-xs text-slate-400">
                        أو اسحب الصور هنا
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {/* الصورة الرئيسية كبيرة */}
                      <div
                        data-img-index={0}
                        className={cn(
                          "relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 transition",
                          dragOverIdx === 0 && dragFrom.current !== null && "ring-4 ring-brand-400"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previews[0]}
                          alt="الصورة الرئيسية"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-black text-white shadow">
                          <Star size={11} /> الصورة الرئيسية
                        </span>
                        <button
                          type="button"
                          onPointerDown={onDragHandleDown(0)}
                          onPointerMove={onDragHandleMove}
                          onPointerUp={onDragHandleUp}
                          onPointerCancel={onDragHandleUp}
                          style={{ touchAction: "none" }}
                          className="absolute bottom-3 right-3 inline-flex cursor-grab items-center gap-1 rounded-full bg-black/55 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur active:cursor-grabbing"
                          aria-label="اسحب لإعادة الترتيب"
                        >
                          <GripVertical size={13} /> اسحب
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
                          aria-label="حذف"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* مصغّرات */}
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {previews.slice(1).map((src, i) => {
                          const idx = i + 1;
                          return (
                            <div
                              key={idx}
                              data-img-index={idx}
                              className={cn(
                                "group relative aspect-square overflow-hidden rounded-xl bg-slate-100 transition",
                                dragOverIdx === idx &&
                                  dragFrom.current !== null &&
                                  "ring-4 ring-brand-400"
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                onClick={() => moveImageToFirst(idx)}
                                className="h-full w-full cursor-pointer object-cover"
                              />
                              <button
                                type="button"
                                onPointerDown={onDragHandleDown(idx)}
                                onPointerMove={onDragHandleMove}
                                onPointerUp={onDragHandleUp}
                                onPointerCancel={onDragHandleUp}
                                style={{ touchAction: "none" }}
                                className="absolute bottom-1 right-1 grid h-6 w-6 cursor-grab place-items-center rounded-full bg-black/55 text-white backdrop-blur active:cursor-grabbing"
                                aria-label="اسحب لإعادة الترتيب"
                              >
                                <GripVertical size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white"
                                aria-label="حذف"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {images.length < MAX_IMAGES && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-brand-300 hover:text-brand-600"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <ImagePlus size={20} />
                              <span className="text-[10px] font-bold">إضافة</span>
                            </div>
                          </button>
                        )}
                      </div>
                      <p className="text-center text-[11px] text-slate-400">
                        {images.length} صور · اضغط على صورة لجعلها الرئيسية · اسحب
                        من المقبض ⠿ لإعادة الترتيب
                      </p>

                      <button
                        type="button"
                        onClick={() => setAutoEnhance((v) => !v)}
                        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-slate-200">
                          ✨ تحسين الصور تلقائياً
                        </span>
                        <span
                          className={[
                            "relative h-6 w-11 shrink-0 rounded-full transition",
                            autoEnhance
                              ? "bg-emerald-500"
                              : "bg-slate-300 dark:bg-slate-600",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                              autoEnhance ? "right-1" : "right-6",
                            ].join(" ")}
                          />
                        </span>
                      </button>
                      <p className="mt-1 text-center text-[10px] text-slate-400">
                        يضبط الإضاءة والألوان ويصغّر الحجم — صور أوضح ورفع أسرع
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* ============ Step 2: المعلومات الأساسية ============ */}
              {step === 2 && (
                <>
                  <Card title="معلومات أساسية" subtitle="ابدأ بعنوان واضح وبيانات السيارة">
                    <Field label="عنوان الإعلان" required>
                      <input
                        value={form.title}
                        onChange={(e) => set("title", e.target.value)}
                        placeholder="مثال: تويوتا كامري 2018 بحالة ممتازة"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="القسم" required>
                      <select
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        className={inputCls}
                      >
                        {listingCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {categoryConfig.showVehicleSpecs && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="الماركة">
                          <input
                            value={form.brand}
                            onChange={(e) => set("brand", e.target.value)}
                            placeholder="تويوتا"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="الموديل">
                          <input
                            value={form.model}
                            onChange={(e) => set("model", e.target.value)}
                            placeholder="كامري"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="سنة الصنع">
                          <input
                            type="number"
                            value={form.year}
                            onChange={(e) => set("year", e.target.value)}
                            placeholder="2022"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="المسافة (كم)">
                          <input
                            type="number"
                            value={form.mileage}
                            onChange={(e) => set("mileage", e.target.value)}
                            placeholder="35000"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="نوع الوقود">
                          <select
                            value={form.fuel}
                            onChange={(e) => set("fuel", e.target.value)}
                            className={inputCls}
                          >
                            {fuelTypes.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="ناقل الحركة">
                          <select
                            value={form.transmission}
                            onChange={(e) => set("transmission", e.target.value)}
                            className={inputCls}
                          >
                            {transmissionTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    )}

                    {/* أقسام غير السيارات (قطع غيار/ورش/خدمات): حقول ديناميكية
                        خاصة بكل قسم عبر DynamicFields. لا تظهر للسيارات
                        (لها حقولها اليدوية أعلاه). */}
                    {!categoryConfig.showVehicleSpecs && (
                      <DynamicFields
                        category={form.category}
                        values={form as unknown as Record<string, unknown>}
                        onChange={(k, v) =>
                          set(k as keyof FormState, v)
                        }
                        onToggle={(k, v) =>
                          setBool(k as keyof FormState, v)
                        }
                        skipKeys={["title", "price", "city", "phone"]}
                      />
                    )}
                  </Card>

                  {categoryConfig.showVehicleSpecs && (
                    <Card title="مواصفات إضافية" subtitle="اختر المميزات المتوفرة">
                      <div className="flex flex-wrap gap-2">
                        {FEATURE_CHIPS.map((feat) => {
                          const active = selectedFeatures.includes(feat);
                          return (
                            <button
                              key={feat}
                              type="button"
                              onClick={() => toggleFeature(feat)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition",
                                active
                                  ? "border-brand-500 bg-brand-50 text-brand-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              )}
                            >
                              {active && <Check size={14} className="text-brand-600" />}
                              {feat}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* ============ Step 3: التفاصيل + الموقع ============ */}
              {step === 3 && (
                <>
                  <Card title="وصف الإعلان" subtitle="اشرح حالة السيارة بالتفصيل">
                    <Field label="الوصف" required>
                      <textarea
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={5}
                        placeholder="حالة السيارة، الصيانة، أي ملاحظات..."
                        className={cn(inputCls, "resize-none")}
                      />
                    </Field>
                    <Field label="اللون">
                      <input
                        value={form.color}
                        onChange={(e) => set("color", e.target.value)}
                        placeholder="أبيض"
                        className={inputCls}
                      />
                    </Field>
                  </Card>

                  <Card title="الموقع" subtitle="أين تقع السيارة؟">
                    <Field label="المدينة" required>
                      <select
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                        className={inputCls}
                      >
                        {libyaCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="العنوان (اختياري)">
                      <input
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="حي، شارع..."
                        className={inputCls}
                      />
                    </Field>
                    <Field label="رابط الموقع على الخريطة (اختياري)">
                      <input
                        value={form.mapLink}
                        onChange={(e) => set("mapLink", e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className={inputCls}
                        dir="ltr"
                      />
                    </Field>
                  </Card>
                </>
              )}

              {/* ============ Step 4: السعر ============ */}
              {step === 4 && (
                <Card title="السعر" subtitle="حدّد سعر البيع">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => set("price", e.target.value)}
                        placeholder="0"
                        className="w-40 bg-transparent text-center text-4xl font-black text-slate-900 outline-none placeholder:text-slate-300"
                      />
                      <span className="text-lg font-black text-slate-400">د.ل</span>
                    </div>
                    {Number(form.price) > 0 && (
                      <p className="mt-2 text-sm font-bold text-brand-700">
                        {formatPrice(Number(form.price))} دينار ليبي
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[10000, 25000, 50000, 100000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set("price", String(v))}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        {formatPrice(v)}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* ============ Step 5: التواصل + النشر ============ */}
              {step === 5 && (
                <Card title="معلومات التواصل" subtitle="كيف يتواصل المشترون معك؟">
                  <Field label="الاسم المعروض">
                    <input
                      value={form.sellerName}
                      onChange={(e) => set("sellerName", e.target.value)}
                      placeholder="اسمك أو اسم المعرض"
                      className={inputCls}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="رقم الهاتف" required>
                      <input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="091xxxxxxx"
                        className={inputCls}
                        dir="ltr"
                      />
                    </Field>
                    <Field label="واتساب">
                      <input
                        value={form.whatsapp}
                        onChange={(e) => set("whatsapp", e.target.value)}
                        placeholder="091xxxxxxx"
                        className={inputCls}
                        dir="ltr"
                      />
                    </Field>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                      <CheckCircle size={14} className="text-brand-600 dark:text-brand-300" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        مراجعة الإعلان قبل النشر
                      </span>
                    </div>
                    <div className="flex gap-3 p-3">
                      {previews[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[0]}
                          alt="غلاف"
                          className="h-20 w-24 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[10px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                          لا صور
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white">
                          {form.title || "بدون عنوان"}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {[form.brand, form.model, form.year].filter(Boolean).join(" · ") ||
                            "—"}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {form.price && (
                            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              {form.price} د.ل
                            </span>
                          )}
                          {form.city && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {form.city}
                            </span>
                          )}
                          {form.mileage && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {form.mileage} كم
                            </span>
                          )}
                          <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            {previews.length} صورة
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                    <p className="text-sm font-bold text-slate-700">
                      جاهز للنشر؟
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      سيظهر إعلانك للعموم بعد مراجعة سريعة من المشرف.
                    </p>
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </form>
      </div>

      {/* ============ Sticky Bottom Bar ============ */}
      {/*
        يجلس فوق شريط التنقّل السفلي (BottomNav) على الموبايل كي لا
        يتغطّى زر "التالي". BottomNav ارتفاعه ~64px + هامش 12px + المساحة
        الآمنة، فنرفع الشريط بمقدارها على الموبايل فقط (يختفي BottomNav
        على md+ عبر md:hidden، فنُعيد الشريط لـbottom-0 على الشاشات الكبيرة).
        z-40 ليبقى فوق المحتوى وتحت أي overlay، ومنفصل عن BottomNav (z-50).
      */}
      <div
        className="fixed inset-x-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-lg md:!bottom-0"
        style={{
          // فوق شريط التنقّل على الموبايل (ارتفاعه + هامشه + المساحة الآمنة)
          bottom: "calc(76px + env(safe-area-inset-bottom))",
          // مساحة آمنة أسفل الشريط (تُستخدم فعلياً على md حيث bottom=0)
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              السابق
            </button>
          ) : (
            <div className="w-[1px]" />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-800"
            >
              التالي
              <ChevronLeft size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جارٍ النشر...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  نشر الإعلان
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= مكوّنات مساعدة ================= */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-black text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Stepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (n: number) => void;
}) {
  return (
    <div className="mb-4 rounded-3xl bg-white p-4 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.08)]">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = currentStep > s.n;
          const active = currentStep === s.n;
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onStepClick(s.n)}
                className="flex flex-col items-center gap-1"
              >
                <motion.span
                  animate={{
                    scale: active ? 1.1 : 1,
                  }}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full text-sm font-black transition",
                    done
                      ? "bg-brand-600 text-white"
                      : active
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </motion.span>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    active || done ? "text-brand-700" : "text-slate-400"
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="mx-1 mb-4 h-0.5 flex-1 rounded-full bg-slate-100">
                  <motion.div
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full bg-brand-600"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
