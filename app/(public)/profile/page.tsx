"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  User
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("+218");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaRef.current) return;
    if (user) return;
    if (window.recaptchaVerifier) return;

    let cancelled = false;

    const initRecaptcha = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        auth.languageCode = "ar";

        const verifier = new RecaptchaVerifier(auth, recaptchaRef.current!, {
          size: "normal",
          callback: () => {
            if (!cancelled) {
              setMessage("تم تفعيل التحقق بنجاح.");
            }
          },
          "expired-callback": () => {
            if (!cancelled) {
              setRecaptchaReady(false);
              setMessage("انتهت صلاحية reCAPTCHA. أعد تحميل الصفحة.");
            }
          }
        });

        window.recaptchaVerifier = verifier;
        await verifier.render();

        if (!cancelled) {
          setRecaptchaReady(true);
          setMessage("");
        }
      } catch (error: any) {
        console.error("reCAPTCHA init error:", error);
        if (!cancelled) {
          setRecaptchaReady(false);
          setMessage(
            error?.message || "تعذر تهيئة reCAPTCHA. تحقق من الدومين المصرح به."
          );
        }
      }
    };

    initRecaptcha();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMessage("");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setMessage("تم تسجيل الدخول عبر Google بنجاح.");
    } catch (error: any) {
      console.error("Google login error:", error);
      setMessage(error?.message || "فشل تسجيل الدخول عبر Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      setMessage("");

      if (!phone.trim().startsWith("+")) {
        setMessage("اكتب الرقم بصيغة دولية مثل +218912345678");
        return;
      }

      if (!window.recaptchaVerifier || !recaptchaReady) {
        setMessage("reCAPTCHA غير جاهز بعد. أعد تحميل الصفحة وانتظر ظهوره.");
        return;
      }

      setSendingCode(true);

      const result = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      setMessage("تم إرسال رمز التحقق.");
    } catch (error: any) {
      console.error("Send code error:", error);
      setMessage(
        error?.message ||
          "فشل إرسال الرمز. تحقق من الرقم، الدومين، وظهور reCAPTCHA."
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setMessage("");

      if (!confirmationResult) {
        setMessage("أرسل الرمز أولًا.");
        return;
      }

      if (!code.trim()) {
        setMessage("اكتب رمز التحقق.");
        return;
      }

      setVerifyingCode(true);
      await confirmationResult.confirm(code.trim());
      setMessage("تم تسجيل الدخول برقم الهاتف بنجاح.");
      setCode("");
    } catch (error: any) {
      console.error("Verify code error:", error);
      setMessage(error?.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage("تم تسجيل الخروج.");
    } catch (error: any) {
      setMessage(error?.message || "فشل تسجيل الخروج.");
    }
  };

  if (loading) {
    return (
      <section className="container pb-8">
        <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          جارٍ تحميل الحساب...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container pb-8">
        <div className="grid gap-5">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                حسابي
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                سجّل الدخول عبر Google أو رقم الهاتف.
              </p>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                تسجيل Google
              </h2>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="mt-5 w-full rounded-[22px] bg-[#2F49C8] px-5 py-4 text-lg font-black text-white"
              >
                {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
              </button>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                تسجيل برقم الهاتف
              </h2>

              <label className="mt-5 mb-2 block text-sm font-bold text-slate-500">
                رقم الهاتف
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+218912345678"
                dir="ltr"
                className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-left outline-none dark:bg-slate-800"
              />

              <div className="mt-4">
                <div
                  ref={recaptchaRef}
                  className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="mt-3 text-sm font-bold text-slate-500">
                {recaptchaReady ? "reCAPTCHA جاهز" : "reCAPTCHA غير جاهز بعد"}
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="mt-4 w-full rounded-[18px] bg-slate-900 px-5 py-3 font-black text-white"
              >
                {sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
              </button>

              <label className="mt-4 mb-2 block text-sm font-bold text-slate-500">
                رمز التحقق
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="اكتب الكود"
                dir="ltr"
                className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-left outline-none dark:bg-slate-800"
              />

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifyingCode}
                className="mt-4 w-full rounded-[18px] border border-blue-200 bg-blue-50 px-5 py-3 font-black text-blue-700"
              >
                {verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}
              </button>
            </div>
          </section>

          {message ? (
            <div className="rounded-[20px] bg-slate-100 px-4 py-4 text-center text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="container pb-8">
      <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-black text-slate-950 dark:text-white">
          تم تسجيل الدخول
        </h1>
        <p className="mt-3 text-slate-500 dark:text-slate-300">
          {user.displayName || user.email || user.phoneNumber}
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-[18px] bg-red-500 px-5 py-3 font-black text-white"
        >
          تسجيل الخروج
        </button>
      </div>
    </section>
  );
}
