"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  browserLocalPersistence,
  ConfirmationResult,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  RotateCw,
} from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/auth/auth-layout";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const OTP_RESEND_SECONDS = 144;
const COUNTRY_CODE = "+218"; // ليبيا

type Step = "phone" | "otp";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phoneDigits, setPhoneDigits] = useState(""); // بدون code الدولة
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneAuthUnavailable, setPhoneAuthUnavailable] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const redirectTo = params.get("redirect") || "/profile";
  // تطبيع الرقم: نزيل أي أصفار بادئة قبل دمجه مع رمز الدولة.
  // أرقام ليبيا المحلية تبدأ بـ0 (مثل 0913441664)، لكن الصيغة الدولية
  // لا تحوي هذا الصفر (+218913441664). بدون إزالته يصبح الرقم
  // +2180913441664 وهو خاطئ → لا يصل SMS (سبب "أرقام تعمل وأخرى لا").
  const nationalDigits = phoneDigits.replace(/\D/g, "").replace(/^0+/, "");
  const fullPhone = `${COUNTRY_CODE}${nationalDigits}`;

  // إعادة التوجيه:
  // - مستخدم جديد بدون اسم → /profile/complete
  // - مستخدم مكتمل → redirectTo
  useEffect(() => {
    if (loading || !user) return;

    // مصدر الحقيقة: العلامة الصريحة profileCompleted.
    // fallback للحسابات القديمة قبل إضافة الـflag: لو اسم موجود اعتبره
    // مكتملاً (يحفظ تجربة المستخدمين الحاليين بدون إجبارهم على إعادة الـonboarding).
    const isProfileComplete =
      profile?.profileCompleted === true ||
      (profile?.profileCompleted === undefined && Boolean(profile?.name?.trim()));

    if (!isProfileComplete) {
      router.replace(
        `/profile/complete?redirect=${encodeURIComponent(redirectTo)}`
      );
    } else {
      router.replace(redirectTo);
    }
  }, [user, profile, loading, router, redirectTo]);

  const clearRecaptcha = () => {
    try {
      window.recaptchaVerifier?.clear();
    } catch {/* تجاهل */}
    window.recaptchaVerifier = undefined;
  };

  // تنظيف
  useEffect(() => {
    return () => {
      clearRecaptcha();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // عداد تنازلي
  const startCountdown = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // تهيئة reCAPTCHA invisible (لا يحجز مساحة)
  const ensureRecaptcha = async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === "undefined") return null;
    if (!recaptchaRef.current || !recaptchaRef.current.isConnected) {
      return null;
    }

    clearRecaptcha();

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "invisible",
        callback: () => {/* silent */},
        "expired-callback": () => {
          clearRecaptcha();
          setError("انتهت صلاحية التحقق. أعد المحاولة.");
        },
      });

      await verifier.render();
      window.recaptchaVerifier = verifier;
      return verifier;
    } catch (err) {
      clearRecaptcha();
      setPhoneAuthUnavailable(true);
      console.error("reCAPTCHA init error:", err);
      return null;
    }
  };

  /* ----------------------------------------------------------
   * Step 1: إرسال رقم الهاتف
   * ---------------------------------------------------------- */
  const handleSendCode = async () => {
    setError("");
    setInfo("");

    // تحقق محلي - نتحقق من الرقم بعد إزالة الأصفار البادئة.
    // أرقام ليبيا المحلية 9 أرقام (بدون الصفر) أو 10 (مع الصفر).
    const digits = nationalDigits;
    if (digits.length < 9 || digits.length > 10) {
      setError("اكتب رقم هاتف ليبي صحيح (9 أرقام بعد رمز الدولة).");
      return;
    }

    setSendingCode(true);
    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) {
        setError("تعذّر تهيئة التحقق. استخدم Google.");
        return;
      }

      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmation(result);
      setStep("otp");
      setInfo(`تم إرسال رمز التحقق إلى ${fullPhone}`);
      startCountdown(OTP_RESEND_SECONDS);
    } catch (err: any) {
      clearRecaptcha();
      console.error("PHONE AUTH ERROR:", err);
      console.error("PHONE AUTH CODE:", err?.code);
      console.error("PHONE AUTH MESSAGE:", err?.message);

      const code = err?.code as string | undefined;
      if (code === "auth/billing-not-enabled") {
        setPhoneAuthUnavailable(true);
        setError("تسجيل الدخول برقم الهاتف غير متاح حالياً. استخدم Google.");
      } else if (code === "auth/too-many-requests") {
        setError("عدد كبير من المحاولات. انتظر قليلاً ثم حاول مجدداً.");
      } else if (code === "auth/invalid-phone-number") {
        setError("صيغة الرقم غير صحيحة.");
      } else if (code === "auth/captcha-check-failed") {
        setError("فشل تحقق الأمان. أعد المحاولة.");
      } else if (code === "auth/invalid-app-credential") {
        setError("تعذر تهيئة التحقق الأمني. حدّث الصفحة وأعد المحاولة.");
      } else if (code === "auth/unauthorized-domain") {
        setPhoneAuthUnavailable(true);
        setError("الدومين غير مصرّح به في Firebase.");
      } else {
        setError(err?.code || err?.message || "فشل إرسال الرمز.");
      }
    } finally {
      setSendingCode(false);
    }
  };

  /* ----------------------------------------------------------
   * Step 2: التحقق من الرمز
   * ---------------------------------------------------------- */
  const handleVerifyCode = async () => {
    setError("");
    if (!confirmation) {
      setError("أعد إرسال الرمز.");
      return;
    }
    if (code.length < 6) {
      setError("اكتب الرمز كاملاً (6 أرقام).");
      return;
    }

    setVerifying(true);
    try {
      await confirmation.confirm(code);
      // التوجيه يحدث في useEffect أعلاه عند تغيير user
    } catch (err: any) {
      setError(err?.message || "رمز التحقق غير صحيح.");
    } finally {
      setVerifying(false);
    }
  };

  /* ----------------------------------------------------------
   * Google
   * ---------------------------------------------------------- */
  const handleGoogle = async () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const c = err?.code as string | undefined;
      if (c === "auth/popup-blocked") {
        setError("المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة.");
      } else if (c === "auth/popup-closed-by-user") {
        setError("تم إغلاق نافذة Google قبل إكمال الدخول.");
      } else if (c === "auth/cancelled-popup-request") {
        setError("اضغط مرة واحدة فقط على زر Google.");
      } else if (c === "auth/unauthorized-domain") {
        setError("هذا الدومين غير مصرّح به في Firebase.");
      } else {
        setError(err?.message || "فشل تسجيل الدخول عبر Google.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ----------------------------------------------------------
   * Loading state
   * ---------------------------------------------------------- */
  if (loading) {
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
   * Step: PHONE
   * ============================================================ */
  if (step === "phone") {
    return (
      <AuthLayout
        title="تسجيل الدخول أو التسجيل"
        description="الرجاء تعبئة رقم الموبايل"
        onBack={() => router.back()}
        backType="close"
      >
        <div className="space-y-5">
          {error && <ErrorMessage message={error} />}

          {/* ============ حقل رقم الهاتف ============ */}
          <div>
            <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
              رقم الموبايل
            </label>
            <div
              className="
                flex items-stretch gap-2 rounded-2xl border border-slate-200
                bg-white p-1.5 transition focus-within:border-brand-400
                focus-within:ring-4 focus-within:ring-brand-100
                dark:border-slate-700 dark:bg-slate-900
                dark:focus-within:ring-brand-900/40
              "
            >
              {/* code الدولة - ثابت */}
              <div
                className="
                  flex shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-3
                  text-sm font-black text-slate-700
                  dark:bg-slate-800 dark:text-slate-200
                "
              >
                <LibyaFlag />
                <span dir="ltr">{COUNTRY_CODE}</span>
              </div>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                dir="ltr"
                value={phoneDigits}
                onChange={(e) =>
                  setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="9xxxxxxxx"
                aria-label="ادخل رقم الموبايل"
                disabled={phoneAuthUnavailable}
                className="
                  flex-1 rounded-xl border-0 bg-transparent
                  py-3 px-3 text-base outline-none
                  placeholder:text-slate-400
                  dark:text-white
                "
                onKeyDown={(e) => {
                  if (e.key === "Enter" && phoneDigits.length >= 9) {
                    void handleSendCode();
                  }
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              مثال: 912345678 (بدون 0 في البداية)
            </p>
          </div>

          {/* ============ CTA الأساسي ============ */}
          <button
            type="button"
            onClick={handleSendCode}
            disabled={
              sendingCode ||
              phoneDigits.length < 9 ||
              phoneAuthUnavailable
            }
            className="
              w-full rounded-2xl bg-brand-700 py-4 text-base font-black
              text-white shadow-blue transition active:scale-[0.99]
              hover:bg-brand-800 disabled:cursor-not-allowed
              disabled:bg-slate-300 disabled:text-slate-500
              disabled:shadow-none dark:disabled:bg-slate-700
              dark:disabled:text-slate-500
            "
          >
            {sendingCode ? "جارٍ الإرسال..." : "التالي"}
          </button>

          {/* reCAPTCHA invisible - لا يأخذ مساحة */}
          <div
            ref={recaptchaRef}
            id="recaptcha-container"
            className="pointer-events-none absolute opacity-0"
            aria-hidden="true"
          />

          {phoneAuthUnavailable && (
            <div
              className="
                rounded-2xl border border-amber-200 bg-amber-50 p-3
                text-xs font-bold text-amber-800
                dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200
              "
            >
              ⚠️ تسجيل الدخول برقم الهاتف غير متاح حالياً. استخدم Google.
            </div>
          )}

          {/* ============ فاصل "أو" ============ */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-bold text-slate-400">أو</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* ============ Google ============ */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="
              flex w-full items-center justify-center gap-2 rounded-2xl
              border-2 border-slate-200 bg-white py-3.5
              text-sm font-black text-slate-800 transition
              hover:border-brand-300 active:scale-[0.99]
              disabled:opacity-60
              dark:border-slate-700 dark:bg-slate-900 dark:text-white
            "
          >
            <GoogleIcon />
            {googleLoading ? "جارٍ فتح Google..." : "المتابعة باستخدام Google"}
          </button>

          {/* ============ موافقة قانونية مباشرة تحت أزرار الدخول ============ */}
          {/*
              نضع الجملة هنا (وليس فقط في الـfooter العام لـAuthLayout) حتى
              يراها المستخدم في نقطة القرار: لحظة ما يفكّر يضغط على Google
              أو يكمل التحقّق برقمه. الـlinks تفتح صفحات /terms و /privacy
              الفعلية، وعمداً نتركها inline بنفس flow الصفحة (وليس popup)
              لأن المعيار الرائج في تطبيقات السيارات/التجارة.
          */}
          <p className="text-center text-[12px] leading-6 text-slate-500 dark:text-slate-400">
            عند إنشاء حساب أو تسجيل الدخول، فأنت توافق على{" "}
            <Link
              href="/terms"
              className="font-bold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
            >
              اتفاقية الاستخدام
            </Link>{" "}
            و
            <Link
              href="/privacy"
              className="font-bold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
            >
              {" "}
              سياسة الخصوصية
            </Link>
            .
          </p>

          {/* ============ Sell tagline ============ */}
          <div
            className="
              rounded-3xl border border-slate-200 bg-white p-5
              dark:border-slate-700 dark:bg-slate-900
            "
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أفضل طريقة
            </p>
            <h3 className="text-lg font-black leading-tight text-slate-950 dark:text-white">
              لبيع أو شراء أي سيارة
            </h3>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
              <SellingPoint>تواصل مباشر مع البائعين</SellingPoint>
              <SellingPoint>إعلانات سيارات معتمدة وموثَّقة</SellingPoint>
              <SellingPoint>إدارة إعلاناتك ومحادثاتك بسهولة</SellingPoint>
              <SellingPoint>إضافة إعلانات للسيارات والقطع والخدمات</SellingPoint>
            </ul>
          </div>
        </div>
      </AuthLayout>
    );
  }

  /* ============================================================
   * Step: OTP
   * ============================================================ */
  return (
    <AuthLayout
      title="ادخل رمز التحقق"
      description={`أرسلنا رمزاً مكوناً من 6 أرقام إلى ${fullPhone}`}
      onBack={() => {
        setStep("phone");
        setCode("");
        setError("");
        setInfo("");
        setConfirmation(null);
      }}
      backType="back"
    >
      <div className="space-y-5">
        {error && <ErrorMessage message={error} />}
        {info && !error && <InfoMessage message={info} />}

        {/* ============ حقل رمز التحقق ============ */}
        <div>
          <label className="mb-2 block text-sm font-black text-slate-900 dark:text-white">
            رمز التحقق
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="------"
            maxLength={6}
            aria-label="رمز التحقق"
            autoFocus
            className="
              w-full rounded-2xl border-2 border-slate-200 bg-white
              py-4 text-center font-mono text-3xl font-black
              tracking-[0.6em] outline-none transition
              focus:border-brand-400 focus:ring-4 focus:ring-brand-100
              dark:border-slate-700 dark:bg-slate-900 dark:text-white
              dark:focus:ring-brand-900/40
            "
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === 6) {
                void handleVerifyCode();
              }
            }}
          />
        </div>

        {/* ============ CTA الأساسي ============ */}
        <button
          type="button"
          onClick={handleVerifyCode}
          disabled={verifying || code.length < 6}
          className="
            w-full rounded-2xl bg-brand-700 py-4 text-base font-black
            text-white shadow-blue transition active:scale-[0.99]
            hover:bg-brand-800 disabled:cursor-not-allowed
            disabled:bg-slate-300 disabled:text-slate-500
            disabled:shadow-none dark:disabled:bg-slate-700
          "
        >
          {verifying ? "جارٍ التحقق..." : "تأكيد ودخول"}
        </button>

        {/* ============ Resend / Countdown ============ */}
        <ResendBlock
          countdown={countdown}
          onResend={handleSendCode}
          sending={sendingCode}
        />
      </div>
    </AuthLayout>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="
        rounded-2xl border border-rose-200 bg-rose-50 p-3
        text-sm font-bold text-rose-700
        dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300
      "
    >
      {message}
    </div>
  );
}

function InfoMessage({ message }: { message: string }) {
  return (
    <div
      className="
        flex items-start gap-2 rounded-2xl border border-emerald-200
        bg-emerald-50 p-3 text-sm font-bold text-emerald-800
        dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200
      "
    >
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}

function ResendBlock({
  countdown,
  onResend,
  sending,
}: {
  countdown: number;
  onResend: () => void;
  sending: boolean;
}) {
  const counting = countdown > 0;
  const min = Math.floor(countdown / 60);
  const sec = countdown % 60;
  const formatted =
    min > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${sec}`;

  return (
    <div className="text-center text-sm">
      <p className="text-slate-600 dark:text-slate-400">
        لم يصلك الرمز؟
      </p>
      {counting ? (
        <p className="mt-1 inline-flex items-center gap-1.5 font-bold text-slate-500">
          <Clock size={14} />
          <span dir="ltr">{formatted}</span>
          <span className="text-xs">
            {min > 0 ? "د:ث" : "ثانية"}
          </span>
        </p>
      ) : (
        <button
          type="button"
          onClick={onResend}
          disabled={sending}
          className="
            mt-1 inline-flex items-center gap-1.5 font-black
            text-brand-700 hover:underline disabled:opacity-60
            dark:text-brand-300
          "
        >
          <RotateCw size={14} className={sending ? "animate-spin" : ""} />
          {sending ? "جارٍ الإرسال..." : "إعادة إرسال الرمز"}
        </button>
      )}
    </div>
  );
}

function SellingPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <CheckCircle2
        size={14}
        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

function LibyaFlag() {
  return (
    <svg
      width="22"
      height="14"
      viewBox="0 0 22 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="rounded-sm"
    >
      <rect width="22" height="14" rx="2" fill="#239e46" />
      <rect y="3.5" width="22" height="7" fill="#000" />
      <rect y="10.5" width="22" height="3.5" fill="#e70013" />
      <path
        d="M11.5 7c0-.83.67-1.5 1.5-1.5.41 0 .79.17 1.06.44a1.5 1.5 0 1 0 0 2.12A1.5 1.5 0 0 1 11.5 7z"
        fill="#fff"
      />
      <path
        d="m12.5 6 .15.46h.49l-.4.29.15.47-.4-.3-.4.3.15-.47-.4-.29h.49z"
        fill="#fff"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.9c1.7-1.56 2.69-3.87 2.69-6.6z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.25c-.81.54-1.83.86-3.06.86-2.36 0-4.36-1.59-5.07-3.73H.96v2.33A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.93 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.97-2.33z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.33 0 2.52.46 3.46 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.97 2.33C4.64 5.16 6.64 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
