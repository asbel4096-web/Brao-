"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  browserLocalPersistence,
  ConfirmationResult,
  getRedirectResult,
  onAuthStateChanged,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [phone, setPhone] = useState("+218");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        try {
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult?.user && mounted) {
            setMessage("تم تسجيل الدخول عبر Google بنجاح.");
          }
        } catch (error: any) {
          console.error("Google redirect result error:", error);
          if (mounted) {
            setMessage(error?.message || "فشل استكمال تسجيل الدخول عبر Google.");
          }
        }

        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!mounted) return;

          setUser(currentUser);

          if (currentUser) {
            try {
              await setDoc(
                doc(db, "users", currentUser.uid),
                {
                  uid: currentUser.uid,
                  name: currentUser.displayName || "",
                  email: currentUser.email || "",
                  phone: currentUser.phoneNumber || "",
                  photoURL: currentUser.photoURL || "",
                  providerIds: currentUser.providerData.map((p) => p.providerId),
                  lastLoginAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );
            } catch (error) {
              console.error("Save user error:", error);
            }
          }

          setLoading(false);
        });
      } catch (error: any) {
        console.error("Auth init error:", error);
        if (mounted) {
          setMessage(error?.message || "تعذر تهيئة تسجيل الدخول.");
          setLoading(false);
        }
      }
    };

    initAuth();

    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaContainerRef.current) return;
    if (window.recaptchaVerifier) return;
    if (user) return;

    auth.languageCode = "ar";

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: "normal",
          callback: () => {
            setMessage("تم تفعيل التحقق بنجاح.");
          },
          "expired-callback": () => {
            setMessage("انتهت صلاحية التحقق. أعد المحاولة.");
          }
        }
      );

      window.recaptchaVerifier.render().catch((error: any) => {
        console.error("reCAPTCHA render error:", error);
        setMessage(error?.message || "فشل تحميل reCAPTCHA.");
      });
    } catch (error: any) {
      console.error("reCAPTCHA init error:", error);
      setMessage(error?.message || "تعذر تهيئة reCAPTCHA.");
    }
  }, [user]);

  const firstLetter = useMemo(() => {
    return (
      user?.displayName?.trim()?.charAt(0)?.toUpperCase() ||
      user?.email?.trim()?.charAt(0)?.toUpperCase() ||
      user?.phoneNumber?.trim()?.charAt(0)?.toUpperCase() ||
      "U"
    );
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      setMessage("");
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Google login error:", error);
      setMessage(error?.message || "فشل تسجيل الدخول عبر Google.");
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      setMessage("");

      if (!phone.trim() || !phone.startsWith("+")) {
        setMessage("اكتب رقم الهاتف بصيغة دولية مثل +2189xxxxxxxx.");
        return;
      }

      if (!window.recaptchaVerifier) {
        setMessage("reCAPTCHA غير جاهز بعد. أعد تحميل الصفحة.");
        return;
      }

      setSendingCode(true);
      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      setMessage("تم إرسال رمز التحقق إلى الهاتف.");
    } catch (error: any) {
      console.error("Send code full error:", error);
      setMessage(error?.message || "فشل إرسال رمز التحقق.");

      try {
        const widgetId = await window.recaptchaVerifier?.render();
        if (window.grecaptcha && widgetId !== undefined) {
          window.grecaptcha.reset(widgetId);
        }
      } catch (resetError) {
        console.error("reCAPTCHA reset error:", resetError);
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setMessage("");

      if (!confirmationResult) {
        setMessage("أرسل رمز التحقق أولًا.");
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
      setConfirmationResult(null);
      setCode("");
      setMessage("تم تسجيل الخروج.");
    } catch (error: any) {
      console.error("Logout error:", error);
      setMessage(error?.message || "فشل تسجيل الخروج.");
    }
  };

  if (loading) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-brand-100 bg-white/90 p-8 text-center text-slate-500 shadow-card">
          جارٍ تحميل الحساب...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-card">
            <div className="bg-gradient-to-l from-brand-900 via-brand-700 to-brand-500 px-8 py-8 text-white">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/15 text-4xl ring-1 ring-white/20">
                👤
              </div>
              <h1 className="text-center text-4xl font-black">حسابي</h1>
              <p className="mt-3 text-center text-base text-white/85">
                سجّل الدخول عبر Google أو رقم الهاتف لإدارة حسابك وإعلاناتك داخل براتشو كار.
              </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
              <div className="rounded-[1.75rem] border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-black text-slate-900">
                  تسجيل الدخول عبر Google
                </h2>
                <p className="mb-5 leading-8 text-slate-600">
                  دخول سريع وآمن، ومناسب لإدارة الإعلانات والمفضلة والدردشة من أي جهاز.
                </p>
                <button
                  type="button"
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600"
                  onClick={handleGoogleLogin}
                >
                  تسجيل الدخول عبر Google
                </button>
              </div>

              <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/50 p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-black text-slate-900">
                  تسجيل الدخول برقم الهاتف
                </h2>

                <label className="mb-2 block text-sm font-bold text-slate-600">
                  رقم الهاتف
                </label>
                <input
                  className="mb-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2189xxxxxxxx"
                  dir="ltr"
                />

                <button
                  type="button"
                  className="mb-4 w-full rounded-2xl bg-brand-700 px-5 py-3 font-bold text-white transition hover:bg-brand-800"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
                </button>

                <div className="mb-4">
                  <div
                    ref={recaptchaContainerRef}
                    className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2"
                  />
                </div>

                <label className="mb-2 block text-sm font-bold text-slate-600">
                  رمز التحقق
                </label>
                <input
                  className="mb-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="اكتب الكود"
                  dir="ltr"
                />

                <button
                  type="button"
                  className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 font-bold text-orange-700 transition hover:bg-orange-100"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode}
                >
                  {verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}
                </button>
              </div>
            </div>

            {message ? (
              <div className="mx-6 mb-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700 md:mx-8 md:mb-8">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-card">
          <div className="flex flex-col gap-6 bg-gradient-to-l from-brand-900 via-brand-700 to-brand-500 p-8 text-white md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="h-20 w-20 rounded-[1.5rem] object-cover ring-4 ring-white/15"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/15 text-3xl font-black text-white ring-1 ring-white/20">
                  {firstLetter}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-black">حسابي</h1>
                <p className="mt-2 text-white/85">
                  مرحبًا، {user.displayName || user.phoneNumber || "مستخدم براتشو كار"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="mb-5 text-2xl font-black text-slate-900">معلومات الحساب</h2>

            <div className="space-y-4">
              <InfoRow label="الاسم" value={user.displayName || "غير متوفر"} />
              <InfoRow label="البريد الإلكتروني" value={user.email || "غير متوفر"} />
              <InfoRow label="رقم الهاتف" value={user.phoneNumber || "غير متوفر"} />
              <InfoRow label="المعرّف" value={user.uid} small />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="mb-5 text-2xl font-black text-slate-900">حالة الحساب</h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-700">
                تم تسجيل الدخول بنجاح.
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  طريقة تسجيل الدخول
                </label>
                <div className="flex flex-wrap gap-2">
                  {user.providerData.length ? (
                    user.providerData.map((provider, index) => (
                      <span
                        key={`${provider.providerId}-${index}`}
                        className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700"
                      >
                        {provider.providerId}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                      غير معروفة
                    </span>
                  )}
                </div>
              </div>

              {message ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  {message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  small = false
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-500">{label}</label>
      <div
        className={`flex min-h-[56px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 ${
          small ? "text-xs sm:text-sm" : "text-sm sm:text-base"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
