"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ConfirmationResult,
  linkWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  CheckCircle2,
  Clock,
  PhoneCall,
  Plus,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { AuthLayout } from "@/components/auth/auth-layout";

declare global {
  interface Window {
    recaptchaVerifierVerifyPhone?: RecaptchaVerifier;
  }
}

const OTP_RESEND_SECONDS = 144;
const COUNTRY_CODE = "+218";

type Step = "phone" | "otp" | "success";

export default function VerifyPhonePage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="جارٍ التحميل..." showLegalFooter={false}>
          <div className="skeleton h-12 w-full" />
        </AuthLayout>
      }
    >
      <VerifyPhoneClient />
    </Suspense>
  );
}

function VerifyPhoneClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const redirectTo = params.get("redirect") || "/profile";
  const fullPhone = `${COUNTRY_CODE}${phoneDigits}`;

  /* ----------------------------------------------------------
   * Guards
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?redirect=/verify-phone`);
      return;
    }
    // لو عند المستخدم هاتف موثَّق من Firebase Auth (دخل بـ phone أصلاً) → ارجع
    if (user.phoneNumber) {
      setVerifiedPhone(user.phoneNumber);
      setStep("success");
    }
  }, [user, authLoading, router]);

  /* ----------------------------------------------------------
   * Cleanup
   * ---------------------------------------------------------- */
  useEffect(() => {
    return () => {
      try {
        window.recaptchaVerifierVerifyPhone?.clear();
        window.recaptchaVerifierVerifyPhone = undefined;
      } catch {/* تجاهل */}
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ----------------------------------------------------------
   * Countdown
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Recaptcha (invisible)
   * ---------------------------------------------------------- */
  const ensureRecaptcha = async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === "undefined") return null;
    if (!recaptchaRef.current) return null;
    if (window.recaptchaVerifierVerifyPhone) {
      return window.recaptchaVerifierVerifyPhone;
    }

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "invisible",
        callback: () => {/* silent */},
      });
      await verifier.render();
      window.recaptchaVerifierVerifyPhone = verifier;
      return verifier;
    } catch {
      return null;
    }
  };

  /* ----------------------------------------------------------
   * Step 1: إرسال الرمز
   * ---------------------------------------------------------- */
  const handleSendCode = async () => {
    setError("");

    const digits = phoneDigits.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 10) {
      setError("اكتب رقم هاتف ليبي صحيح (9-10 أرقام).");
      return;
    }

    setSendingCode(true);
    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) {
        setError("تعذّر تهيئة التحقق. حاول لاحقاً.");
        return;
      }

      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmation(result);
      setStep("otp");
      startCountdown(OTP_RESEND_SECONDS);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/billing-not-enabled") {
        setError("توثيق الهاتف غير متاح حالياً.");
      } else if (code === "auth/too-many-requests") {
        setError("عدد كبير من المحاولات. انتظر قليلاً.");
      } else if (code === "auth/invalid-phone-number") {
        setError("صيغة الرقم غير صحيحة.");
      } else if (code === "auth/account-exists-with-different-credential") {
        setError("هذا الرقم مستخدم في حساب آخر.");
      } else {
        setError(err?.message || "فشل إرسال الرمز.");
      }
    } finally {
      setSendingCode(false);
    }
  };

  /* ----------------------------------------------------------
   * Step 2: تأكيد الرمز + ربط بالحساب
   * ---------------------------------------------------------- */
  const handleVerify = async () => {
    setError("");

    if (!confirmation) {
      setError("أعد إرسال الرمز.");
      return;
    }
    if (code.length < 6) {
      setError("اكتب الرمز كاملاً.");
      return;
    }
    if (!user) {
      setError("انتهت جلستك. أعد تسجيل الدخول.");
      return;
    }

    setVerifying(true);
    try {
      // نستخدم credential لربطه بحساب المستخدم الحالي بدلاً من تسجيل دخول جديد
      const credential = PhoneAuthProvider.credential(
        confirmation.verificationId,
        code
      );

      try {
        // محاولة linking (للمستخدم الحالي - مثل من Google)
        await linkWithCredential(user, credential);
      } catch (linkErr: any) {
        const linkCode = linkErr?.code as string | undefined;
        if (linkCode === "auth/provider-already-linked") {
          // الهاتف مرتبط بالفعل - تجاهل وتابع
        } else if (linkCode === "auth/credential-already-in-use") {
          setError("هذا الرقم مرتبط بحساب آخر.");
          setVerifying(false);
          return;
        } else if (linkCode === "auth/email-already-in-use") {
          setError("الإيميل المرتبط بهذا الرقم مستخدم.");
          setVerifying(false);
          return;
        } else {
          throw linkErr;
        }
      }

      // حفظ الرقم في Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          phone: fullPhone,
          phoneVerified: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshProfile();
      setVerifiedPhone(fullPhone);
      setStep("success");
    } catch (err: any) {
      setError(err?.message || "رمز التحقق غير صحيح.");
    } finally {
      setVerifying(false);
    }
  };

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  if (authLoading || !user) {
    return (
      <AuthLayout title="جارٍ التحميل..." showLegalFooter={false}>
        <div className="skeleton h-12 w-full" />
      </AuthLayout>
    );
  }

  /* ============== Step: success ============== */
  if (step === "success") {
    return (
      <AuthLayout
        title="تم التوثيق بنجاح"
        onBack={() => router.replace(redirectTo)}
        backType="close"
      >
        <div className="space-y-5">
          {/* بطاقة نجاح */}
          <div
            className="
              flex items-start gap-3 rounded-3xl border-2
              border-emerald-200 bg-emerald-50 p-5
              dark:border-emerald-800 dark:bg-emerald-950/30
            "
          >
            <div
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-full bg-emerald-500 text-white shadow-md
              "
            >
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تم التوثيق
              </h3>
              <p
                dir="ltr"
                className="mt-0.5 text-sm text-slate-700 dark:text-slate-200"
              >
                {verifiedPhone}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <Link
            href={redirectTo}
            className="
              flex w-full items-center justify-center
              rounded-2xl bg-brand-700 py-4 text-base font-black
              text-white shadow-blue transition active:scale-[0.99]
              hover:bg-brand-800
            "
          >
            متابعة
          </Link>

          <Link
            href="/add-listing"
            className="
              flex w-full items-center justify-center gap-2
              rounded-2xl bg-action-500 py-3.5 text-sm font-black
              text-white shadow-action transition active:scale-[0.99]
              hover:bg-action-600
            "
          >
            <Plus size={18} />
            أضف إعلان
          </Link>
        </div>
      </AuthLayout>
    );
  }

  /* ============== Step: otp ============== */
  if (step === "otp") {
    return (
      <AuthLayout
        title="ادخل رمز التحقق"
        description={`أرسلنا رمزاً مكوناً من 6 أرقام إلى ${fullPhone}`}
        onBack={() => {
          setStep("phone");
          setCode("");
          setError("");
          setConfirmation(null);
        }}
      >
        <div className="space-y-5">
          {error && <ErrorMessage message={error} />}

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
                  void handleVerify();
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || code.length < 6}
            className="
              w-full rounded-2xl bg-brand-700 py-4 text-base font-black
              text-white shadow-blue transition active:scale-[0.99]
              hover:bg-brand-800 disabled:cursor-not-allowed
              disabled:bg-slate-300 disabled:text-slate-500
              disabled:shadow-none dark:disabled:bg-slate-700
            "
          >
            {verifying ? "جارٍ التحقق..." : "تأكيد التوثيق"}
          </button>

          <ResendBlock
            countdown={countdown}
            onResend={handleSendCode}
            sending={sendingCode}
          />
        </div>
      </AuthLayout>
    );
  }

  /* ============== Step: phone ============== */
  return (
    <AuthLayout
      title="قم بتوثيق رقم الموبايل"
      description="لبناء الثقة وحماية المستخدمين، سنرسل لك رمزاً إلى الرقم أدناه ليتم توثيقه."
      onBack={() => router.replace(redirectTo)}
      backType="close"
    >
      <div className="space-y-5">
        {error && <ErrorMessage message={error} />}

        {/* صندوق توضيحي - لماذا التوثيق */}
        <div
          className="
            flex items-start gap-3 rounded-2xl border border-brand-200
            bg-brand-50/60 p-4
            dark:border-brand-800 dark:bg-brand-950/30
          "
        >
          <div
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-full bg-brand-100 text-brand-700
              dark:bg-brand-900/40 dark:text-brand-300
            "
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              لماذا توثيق الرقم؟
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              يضمن وصول المشترين إليك بسرعة ويعزّز ثقتهم في إعلاناتك.
            </p>
          </div>
        </div>

        {/* حقل الهاتف */}
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
              dir="ltr"
              autoComplete="tel-national"
              value={phoneDigits}
              onChange={(e) =>
                setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="9xxxxxxxx"
              autoFocus
              className="
                flex-1 rounded-xl border-0 bg-transparent
                py-3 px-3 text-base outline-none
                placeholder:text-slate-400 dark:text-white
              "
              onKeyDown={(e) => {
                if (e.key === "Enter" && phoneDigits.length >= 9) {
                  void handleSendCode();
                }
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sendingCode || phoneDigits.length < 9}
          className="
            flex w-full items-center justify-center gap-2 rounded-2xl
            bg-brand-700 py-4 text-base font-black text-white shadow-blue
            transition active:scale-[0.99] hover:bg-brand-800
            disabled:cursor-not-allowed disabled:bg-slate-300
            disabled:text-slate-500 disabled:shadow-none
            dark:disabled:bg-slate-700
          "
        >
          <PhoneCall size={18} />
          {sendingCode ? "جارٍ الإرسال..." : "إرسال رمز التوثيق"}
        </button>

        {/* reCAPTCHA invisible */}
        <div ref={recaptchaRef} className="hidden" />
      </div>
    </AuthLayout>
  );
}

/* ============================================================
 * Sub-components (shared)
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
      <p className="text-slate-600 dark:text-slate-400">لم يصلك الرمز؟</p>
      {counting ? (
        <p className="mt-1 inline-flex items-center gap-1.5 font-bold text-slate-500">
          <Clock size={14} />
          <span dir="ltr">{formatted}</span>
          <span className="text-xs">{min > 0 ? "د:ث" : "ثانية"}</span>
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
