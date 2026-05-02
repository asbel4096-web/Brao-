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
import { Phone, Smartphone } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

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
  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  const redirectTo = params.get("redirect") || "/profile";

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [user, loading, router, redirectTo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaRef.current) return;
    if (window.recaptchaVerifier || user || phoneAuthUnavailable) return;

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: "normal",
        callback: () => setMessage("تم التحقق بنجاح، اضغط إرسال الرمز."),
        "expired-callback": () => {
          setError("انتهت صلاحية التحقق. أعد المحاولة.");
        },
      });

      window.recaptchaVerifier.render().catch(() => {
        setError("فشل تحميل reCAPTCHA. تحقق من اتصال الإنترنت.");
      });
    } catch (err) {
      console.error("reCAPTCHA init error:", err);
      setError("تعذّر تهيئة reCAPTCHA.");
    }

    return () => {
      try {
        window.recaptchaVerifier?.clear();
        window.recaptchaVerifier = undefined;
      } catch {
      }
    };
  }, [user, phoneAuthUnavailable]);

  const handleGoogle = async () => {
    if (googleLoading) return;

    setError("");
    setMessage("");
    setGoogleLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error("Google login error:", err);

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

    if (!window.recaptchaVerifier) {
      setError("reCAPTCHA غير جاهز. أعد تحميل الصفحة.");
      return;
    }

    setSendingCode(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        window.recaptchaVerifier
      );

      setConfirmation(result);
      setMessage("تم إرسال رمز التحقق إلى رقمك.");
    } catch (err: unknown) {
      console.error("Send code error:", err);

      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError?.code === "auth/billing-not-enabled") {
        setPhoneAuthUnavailable(true);
        setConfirmation(null);
        setError("تسجيل الدخول برقم الهاتف غير متاح حاليًا. استخدم تسجيل الدخول عبر Google.");
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
      console.error("Verify code error:", err);

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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
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
                />

                <div className="my-3 min-h-[78px] rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                  <div ref={recaptchaRef} className="flex justify-center" />
                </div>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="btn-secondary mb-3 w-full"
                >
                  {sendingCode ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                </button>

                <label className="label">رمز التحقق</label>
                <input
                  dir="ltr"
                  className="input mb-3"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || !confirmation}
                  className="btn-action w-full"
                >
                  {verifying ? "جارٍ التحقق..." : "تأكيد الرمز ودخول"}
                </button>
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
