"use client";

import { Suspense, ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { Camera } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { AuthLayout } from "@/components/auth/auth-layout";

type Step = "name" | "photo" | "contact" | "review";

const STEPS: { key: Step; n: number; total: number }[] = [
  { key: "name", n: 1, total: 4 },
  { key: "photo", n: 2, total: 4 },
  { key: "contact", n: 3, total: 4 },
  { key: "review", n: 4, total: 4 },
];

/**
 * صفحة إكمال الحساب - تجربة onboarding متدرّجة.
 *
 * بعد التسجيل الأول، المستخدم يمرّ بـ 4 خطوات صغيرة:
 *  1. الاسم
 *  2. الصورة الشخصية (اختياري - يمكن تجاوزه)
 *  3. بيانات التواصل (إيميل + هاتف بديل)
 *  4. مراجعة قبل الحفظ
 *
 * مبدأ: شاشة واحدة = هدف واحد. CTA كبير + خطوة واضحة.
 */
export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="جارٍ التحميل..." showLegalFooter={false}>
          <div className="space-y-3">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </AuthLayout>
      }
    >
      <CompleteProfilePageInner />
    </Suspense>
  );
}

function CompleteProfilePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  const redirectTo = params.get("redirect") || "/profile";

  /* ----------------------------------------------------------
   * تهيئة من profile (لو موجود) + redirect لو مكتمل
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/profile/complete");
      return;
    }

    // pre-fill من profile
    setName(profile?.name || user.displayName || "");
    setEmail(profile?.email || user.email || "");
    setPhone(profile?.phone || user.phoneNumber || "");
    setBio(profile?.bio || "");
    setPhotoURL(profile?.photoURL || user.photoURL || "");
  }, [user, profile, authLoading, router]);

  /* ----------------------------------------------------------
   * Image preview
   * ---------------------------------------------------------- */
  const previewPhoto = photoFile ? URL.createObjectURL(photoFile) : photoURL;

  useEffect(() => {
    return () => {
      if (photoFile && previewPhoto) URL.revokeObjectURL(previewPhoto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoFile]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الصورة يجب أن تكون أقل من 5 ميجابايت.");
      return;
    }
    setPhotoFile(file);
  };

  /* ----------------------------------------------------------
   * التنقل بين الخطوات
   * ---------------------------------------------------------- */
  const currentStep = STEPS.find((s) => s.key === step)!;
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const goNext = () => {
    if (step === "name" && !name.trim()) {
      toast.warning("اكتب اسمك للمتابعة.");
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  };

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  /* ----------------------------------------------------------
   * الحفظ النهائي
   * ---------------------------------------------------------- */
  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("الاسم مطلوب.");
      setStep("name");
      return;
    }

    setSaving(true);
    try {
      // رفع الصورة لو موجودة
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const safeName = photoFile.name.replace(/\s+/g, "-");
        const fileRef = ref(
          storage,
          `users/${user.uid}/${Date.now()}-${safeName}`
        );
        await uploadBytes(fileRef, photoFile, {
          contentType: photoFile.type,
        });
        finalPhotoURL = await getDownloadURL(fileRef);
      }

      // حفظ في Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: name.trim(),
          email: email.trim() || user.email || "",
          phone: phone.trim() || user.phoneNumber || "",
          bio: bio.trim(),
          photoURL: finalPhotoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // تحديث displayName
      try {
        await updateProfile(user, {
          displayName: name.trim(),
          photoURL: finalPhotoURL || user.photoURL || "",
        });
      } catch {
        /* non-fatal */
      }

      await refreshProfile();
      toast.success("تم إكمال حسابك بنجاح!");
      router.replace(redirectTo);
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------
   * Loading
   * ---------------------------------------------------------- */
  if (authLoading || !user) {
    return (
      <AuthLayout title="جارٍ التحميل..." showLegalFooter={false}>
        <div className="space-y-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </AuthLayout>
    );
  }

  /* ============================================================
   * Render
   * ============================================================ */
  return (
    <AuthLayout
      title={getStepTitle(step)}
      description={getStepDescription(step)}
      onBack={isFirst ? () => router.push(redirectTo) : goPrev}
      backType={isFirst ? "close" : "back"}
    >
      <div className="space-y-5">
        <StepProgress current={currentStep.n} total={currentStep.total} />

        {step === "name" && <StepName name={name} onChange={setName} />}

        {step === "photo" && (
          <StepPhoto
            preview={previewPhoto}
            initial={name.charAt(0).toUpperCase() || "U"}
            onPick={handlePhotoChange}
            onRemove={() => {
              setPhotoFile(null);
              setPhotoURL("");
            }}
          />
        )}

        {step === "contact" && (
          <StepContact
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            bio={bio}
            setBio={setBio}
          />
        )}

        {step === "review" && (
          <StepReview
            name={name}
            email={email}
            phone={phone}
            bio={bio}
            preview={previewPhoto}
            initial={name.charAt(0).toUpperCase() || "U"}
          />
        )}

        <div className="pt-2">
          {isLast ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
                w-full rounded-2xl bg-brand-700 py-4 text-base font-black
                text-white shadow-blue transition active:scale-[0.99]
                hover:bg-brand-800 disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {saving ? "جارٍ الحفظ..." : "حفظ وإكمال"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="
                w-full rounded-2xl bg-brand-700 py-4 text-base font-black
                text-white shadow-blue transition active:scale-[0.99]
                hover:bg-brand-800
              "
            >
              التالي
            </button>
          )}

          {step === "photo" && (
            <button
              type="button"
              onClick={goNext}
              className="
                mt-3 block w-full text-center text-sm font-bold
                text-slate-500 hover:text-slate-700 hover:underline
                dark:text-slate-400 dark:hover:text-slate-200
              "
            >
              تخطّي هذه الخطوة
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

/* ============================================================
 * Step content components
 * ============================================================ */

function StepName({
  name,
  onChange,
}: {
  name: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
        الاسم الكامل
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: محمد الفقيه"
        autoFocus
        maxLength={60}
        className="
          w-full rounded-2xl border-2 border-slate-200 bg-white
          px-4 py-3.5 text-base outline-none transition
          focus:border-brand-400 focus:ring-4 focus:ring-brand-100
          dark:border-slate-700 dark:bg-slate-900 dark:text-white
          dark:focus:ring-brand-900/40
        "
      />
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        يظهر للمشترين على إعلاناتك. يمكنك استخدام اسم نشاطك التجاري.
      </p>
    </div>
  );
}

function StepPhoto({
  preview,
  initial,
  onPick,
  onRemove,
}: {
  preview: string;
  initial: string;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="صورة الحساب"
            className="
              h-32 w-32 rounded-full object-cover ring-4 ring-brand-100
              dark:ring-brand-900/40
            "
          />
        ) : (
          <div
            className="
              flex h-32 w-32 items-center justify-center rounded-full
              bg-gradient-to-br from-brand-700 to-brand-500
              text-5xl font-black text-white shadow-blue
            "
          >
            {initial}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="تغيير الصورة"
          className="
            absolute bottom-0 left-0 inline-flex h-10 w-10
            items-center justify-center rounded-full bg-brand-700
            text-white shadow-blue transition active:scale-95
            hover:bg-brand-800
          "
        >
          <Camera size={18} />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="
          mt-5 inline-flex items-center gap-2 rounded-2xl
          border-2 border-brand-200 bg-brand-50 px-4 py-2.5
          text-sm font-black text-brand-700 transition
          hover:bg-brand-100 active:scale-95
          dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300
        "
      >
        <Camera size={16} />
        {preview ? "تغيير الصورة" : "اختر صورة"}
      </button>

      {preview && (
        <button
          type="button"
          onClick={onRemove}
          className="
            mt-2 text-xs font-bold text-rose-600 hover:underline
            dark:text-rose-400
          "
        >
          إزالة الصورة
        </button>
      )}

      <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
        صورة واضحة تبني الثقة مع المشترين. حد أقصى 5 ميجابايت.
      </p>
    </div>
  );
}

function StepContact({
  email,
  setEmail,
  phone,
  setPhone,
  bio,
  setBio,
}: {
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
          البريد الإلكتروني{" "}
          <span className="text-xs font-normal text-slate-400">(اختياري)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          className="
            w-full rounded-2xl border-2 border-slate-200 bg-white
            px-4 py-3 text-base outline-none transition
            focus:border-brand-400 focus:ring-4 focus:ring-brand-100
            dark:border-slate-700 dark:bg-slate-900 dark:text-white
            dark:focus:ring-brand-900/40
          "
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
          رقم هاتف بديل{" "}
          <span className="text-xs font-normal text-slate-400">(اختياري)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912345678"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          className="
            w-full rounded-2xl border-2 border-slate-200 bg-white
            px-4 py-3 text-base outline-none transition
            focus:border-brand-400 focus:ring-4 focus:ring-brand-100
            dark:border-slate-700 dark:bg-slate-900 dark:text-white
            dark:focus:ring-brand-900/40
          "
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
          نبذة قصيرة{" "}
          <span className="text-xs font-normal text-slate-400">(اختياري)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="مثال: معرض سيارات في طرابلس - 10 سنوات خبرة"
          rows={3}
          maxLength={200}
          className="
            w-full resize-none rounded-2xl border-2 border-slate-200 bg-white
            px-4 py-3 text-base outline-none transition
            focus:border-brand-400 focus:ring-4 focus:ring-brand-100
            dark:border-slate-700 dark:bg-slate-900 dark:text-white
            dark:focus:ring-brand-900/40
          "
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {bio.length}/200
        </p>
      </div>
    </div>
  );
}

function StepReview({
  name,
  email,
  phone,
  bio,
  preview,
  initial,
}: {
  name: string;
  email: string;
  phone: string;
  bio: string;
  preview: string;
  initial: string;
}) {
  return (
    <div
      className="
        rounded-3xl border-2 border-slate-200 bg-white p-5
        dark:border-slate-700 dark:bg-slate-900
      "
    >
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
          />
        ) : (
          <div
            className="
              flex h-14 w-14 items-center justify-center rounded-full
              bg-gradient-to-br from-brand-700 to-brand-500
              text-xl font-black text-white
            "
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
            {name || "—"}
          </h3>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ReviewRow label="البريد الإلكتروني" value={email} />
        <ReviewRow label="رقم هاتف بديل" value={phone} dir="ltr" />
        <ReviewRow label="نبذة" value={bio} multiline />
      </div>

      <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
        💡 يمكنك تعديل هذه البيانات لاحقاً من صفحة "ملفي الشخصي".
      </p>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  dir,
  multiline,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        dir={dir}
        className={`mt-0.5 text-sm text-slate-900 dark:text-white ${
          multiline ? "whitespace-pre-wrap" : "truncate"
        }`}
      >
        {value || <span className="text-slate-400">— غير محدد</span>}
      </div>
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-black text-brand-700 dark:text-brand-300">
          الخطوة {current} من {total}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {Math.round((current / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="
            h-full rounded-full bg-gradient-to-l from-brand-700 to-brand-500
            transition-all duration-500
          "
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function getStepTitle(step: Step): string {
  switch (step) {
    case "name":
      return "ما اسمك؟";
    case "photo":
      return "أضف صورة لحسابك";
    case "contact":
      return "بيانات التواصل";
    case "review":
      return "تأكيد البيانات";
  }
}

function getStepDescription(step: Step): string {
  switch (step) {
    case "name":
      return "هذا الاسم سيظهر على إعلاناتك للمشترين.";
    case "photo":
      return "اختياري — لكن الصورة تساعد على بناء الثقة.";
    case "contact":
      return "كل هذه الحقول اختيارية. يمكنك إكمالها لاحقاً.";
    case "review":
      return "راجع بياناتك ثم اضغط حفظ لإكمال التسجيل.";
  }
}
