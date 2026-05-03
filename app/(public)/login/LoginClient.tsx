"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  browserLocalPersistence,
  ConfirmationResult,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import { Phone, Smartphone, Clock, RotateCw, ShieldCheck } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

// مدة العداد قبل السماح بإعادة الإرسال (بالثواني)
const OTP_RESEND_SECONDS = 144;

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phone, setPhone] = useState("+218");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneAuthUnavailable, setPhoneAuthUnavailable] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const redirectTo = params.get("redirect") || "/profile";

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [user, loading, router, redirectTo]);

  // تنظيف reCAPTCHA والمؤقّت عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      try {
        window.recaptchaVerifier?.clear();
        window.recaptchaVerifier = undefined;
      } catch {
        // تجاهل
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // عداد تنازلي: يبدأ من القيمة المحددة وينقص كل ثانية
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

  // تهيئة reCAPTCHA عند الطلب فقط (lazy)
  const ensureRecaptcha = async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === "undefined") return null;
    if (!recaptchaRef.current) return null;
    if (window.recaptchaVerifier) return window.recaptchaVerifier;

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "normal",
        callback: () => setMessage("تم التحقق بنجاح، اضغط إرسال الرمز."),
        "expired-callback": () => {
          setError("انتهت صلاحية التحقق. أعد المحاولة.");
        },
      });

      await verifier.render();
      window.recaptchaVerifier = verifier;
      return verifier;
    } catch {
      // فشل reCAPTCHA = phone auth غير متاح
      setPhoneAuthUnavailable(true);
      return null;
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;

    setError("");
    setMessage("");
    setGoogleLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const errorCode = firebaseError?.code;

      if (errorCode === "auth/popup-blocked") {
        setError("المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة.");
      } else if (errorCode === "auth/popup-closed-by-user") {
        setError("تم إغلاق نافذة Google قبل إكمال تسجيل الدخول.");
      } else if (errorCode === "auth/cancelled-popup-request") {
        setError("اضغط مرة واحدة فقط على زر Google.");
      } else if (errorCode === "auth/unauthorized-domain") {
        setError("هذا الدومين غير مصرح به في Firebase. أضفه في Authentication > Settings > Authorized domains.");
      } else {
        setError(firebaseError?.message || "فشل تسجيل الدخول عبر Google.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError("");
    setMessage("");

    if (!phone.trim().startsWith("+")) {
      setError("اكتب الرقم بصيغة دولية تبدأ بـ +218.");
      return;
    }

    setSendingCode(true);

    try {
      const verifier = await ensureRecaptcha();
      if (!verifier) {
        setError("تعذّر تهيئة reCAPTCHA. استخدم تسجيل الدخول عبر Google.");
        setSendingCode(false);
        return;
      }

      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        verifier
      );

      setConfirmation(result);
      setMessage("تم إرسال رمز التحقق إلى رقمك.");
      // ابدأ العداد التنازلي بعد إرسال ناجح
      startCountdown(OTP_RESEND_SECONDS);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError?.code === "auth/billing-not-enabled") {
        setPhoneAuthUnavailable(true);
        setConfirmation(null);
        setError("تسجيل الدخول برقم الهاتف غير متاح حاليًا. استخدم تسجيل الدخول عبر Google.");
        return;
      }

      if (firebaseError?.code === "auth/too-many-requests") {
        setError("عدد كبير من المحاولات. انتظر قليلاً ثم حاول مجدداً.");
        return;
      }

      setError(
        firebaseError?.message ||
          "فشل إرسال الرمز. تأكد من الرقم وreCAPTCHA والدومينات المصرّح بها."
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    setMessage("");

    if (!confirmation) {
      setError("أرسل رمز التحقق أولاً.");
      return;
    }

    if (!code.trim()) {
      setError("اكتب رمز التحقق.");
      return;
    }

    setVerifying(true);

    try {
      await confirmation.confirm(code.trim());
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      setError(firebaseError?.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  // وضعية الإرسال: قبل الإرسال / أثناء العداد / بعد العداد
  const codeSent = !!confirmation;
  const canResend = codeSent && countdown === 0 && !sendingCode;
  const isCountingDown = countdown > 0;

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="section-title">تسجيل الدخول</h1>
          <p className="section-subtitle mx-auto">
            اختر طريقة تسجيل الدخول المناسبة لإدارة حسابك وإعلاناتك.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* بطاقة Google */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Smartphone size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black dark:text-white">Google</h2>
                <p className="text-sm text-slate-500">دخول سريع بحساب Google.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="btn-primary w-full"
            >
              {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
            </button>
          </div>

          {/* بطاقة رقم الهاتف */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-700/30 dark:text-action-200">
                <Phone size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black dark:text-white">رقم الهاتف</h2>
                <p className="text-sm text-slate-500">استلام رمز SMS للتحقق.</p>
              </div>
            </div>

            {phoneAuthUnavailable ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                تسجيل الدخول برقم الهاتف غير متاح حاليًا في هذا المشروع. استخدم تسجيل الدخول عبر Google إلى أن يتم تفعيل Billing في Firebase.
              </div>
            ) : (
              <>
                <label className="label">رقم الهاتف</label>
                <input
                  dir="ltr"
                  className="input mb-3"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2189xxxxxxxx"
                  disabled={codeSent}
                  inputMode="tel"
                  autoComplete="tel"
                />

                <div className="my-3 min-h-[78px] rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                  <div ref={recaptchaRef} className="flex justify-center" />
                </div>

                {/* قبل الإرسال: زر "إرسال رمز التحقق" */}
                {!codeSent && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="btn-secondary mb-3 w-full"
                  >
                    {sendingCode ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                  </button>
                )}

                {/* بعد الإرسال: حقل الرمز + زر التحقق + عداد إعادة الإرسال */}
                {codeSent && (
                  <>
                    {/* بطاقة العداد */}
                    <OtpCountdownCard
                      countdown={countdown}
                      isCountingDown={isCountingDown}
                      canResend={canResend}
                      sendingResend={sendingCode}
                      onResend={handleSendCode}
                    />

                    <label className="label">رمز التحقق</label>
                    <input
                      dir="ltr"
                      className="input mb-3 text-center font-mono text-2xl tracking-[0.5em] font-black"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="------"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />

                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifying || code.length < 6}
                      className="btn-action w-full"
                    >
                      {verifying ? "جارٍ التحقق..." : "تأكيد الرمز ودخول"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          بدخولك إلى براتشو كار، فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
 * بطاقة عداد إعادة إرسال OTP
 * ============================================================ */

function OtpCountdownCard({
  countdown,
  isCountingDown,
  canResend,
  sendingResend,
  onResend,
}: {
  countdown: number;
  isCountingDown: boolean;
  canResend: boolean;
  sendingResend: boolean;
  onResend: () => void;
}) {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formatted =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}`;

  // نسبة التقدم 0-100 (من القيمة الكاملة إلى 0)
  const FULL = 144;
  const progress = Math.max(0, Math.min(100, (countdown / FULL) * 100));

  return (
    <div
      className="
        mb-4 overflow-hidden rounded-2xl border
        bg-gradient-to-br from-brand-50 to-white
        dark:border-brand-800 dark:from-brand-900/20 dark:to-slate-900
      "
      style={{ borderColor: isCountingDown ? "rgb(191 219 254)" : undefined }}
    >
      <div className="p-4">
        {isCountingDown ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Clock size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                يمكنك إعادة الإرسال بعد
              </p>
              <p className="font-mono text-lg font-black text-brand-700 dark:text-brand-300">
                {formatted}
                <span className="mr-1 text-xs font-bold text-slate-500">
                  {minutes > 0 ? "د:ث" : "ثانية"}
                </span>
              </p>
            </div>
            <ShieldCheck
              size={20}
              className="shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                لم يصلك الرمز؟
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                يمكنك طلب إعادة الإرسال الآن
              </p>
            </div>
            <button
              type="button"
              onClick={onResend}
              disabled={!canResend}
              className="btn-secondary !py-2 !px-3 !text-xs"
            >
              <RotateCw size={14} className={sendingResend ? "animate-spin" : ""} />
              {sendingResend ? "جارٍ..." : "إعادة الإرسال"}
            </button>
          </div>
        )}
      </div>

      {/* شريط التقدم */}
      {isCountingDown && (
        <div className="h-1 w-full bg-brand-100 dark:bg-brand-900/40">
          <div
            className="h-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
