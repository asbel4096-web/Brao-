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
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setMessage("تم تسجيل الدخول عبر Google بنجاح.");
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
        setMessage("حدث خطأ أثناء إكمال تسجيل الدخول عبر Google.");
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

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
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaContainerRef.current) return;

    const timer = setTimeout(() => {
      if (window.recaptchaVerifier) return;

      try {
        auth.languageCode = "ar";

        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {
            size: "normal",
            callback: () => {
              setMessage("تم تفعيل reCAPTCHA بنجاح.");
            },
            "expired-callback": () => {
              setMessage("انتهت صلاحية reCAPTCHA، أعد المحاولة.");
            }
          }
        );

        window.recaptchaVerifier.render().catch((error) => {
          console.error("reCAPTCHA render error:", error);
          setMessage("فشل تحميل reCAPTCHA.");
        });
      } catch (error) {
        console.error("reCAPTCHA init error:", error);
        setMessage("تعذر تهيئة reCAPTCHA.");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Google login error:", error);
      setMessage("فشل بدء تسجيل الدخول عبر Google.");
      alert("فشل تسجيل الدخول عبر Google.");
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
    } catch (error) {
      console.error("Send code error:", error);
      setMessage("فشل إرسال رمز التحقق. تحقق من الرقم أو reCAPTCHA.");
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
    } catch (error) {
      console.error("Verify code error:", error);
      setMessage("رمز التحقق غير صحيح أو انتهت صلاحيته.");
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
    } catch (error) {
      console.error("Logout error:", error);
      setMessage("فشل تسجيل الخروج.");
    }
  };

  if (loading) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          جارٍ تحميل الحساب...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                👤
              </div>
              <h1 className="text-4xl font-black text-slate-900">حسابي</h1>
              <p className="mt-3 text-lg text-slate-500">
                سجّل الدخول عبر Google أو رقم الهاتف لإدارة حسابك وإعلاناتك.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="mb-4 text-2xl font-black text-slate-900">
                  تسجيل الدخول عبر Google
                </h2>
                <p className="mb-5 leading-8 text-slate-600">
                  مناسب وسريع للمستخدمين، خصوصًا إذا كان الحساب مرتبطًا بالبريد.
                </p>
                <button
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white"
                  onClick={handleGoogleLogin}
                >
                  تسجيل الدخول عبر Google
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="mb-4 text-2xl font-black text-slate-900">
                  تسجيل الدخول برقم الهاتف
                </h2>

                <label className="mb-2 block text-sm font-bold text-slate-500">
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
                  className="mb-4 w-full rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
                </button>

                <div className="mb-4">
                  <div
                    ref={recaptchaContainerRef}
                    id="recaptcha-container"
                    className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2"
                  />
                </div>

                <label className="mb-2 block text-sm font-bold text-slate-500">
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
                  className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode}
                >
                  {verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}
                </button>
              </div>
            </div>

            {message ? (
              <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700">
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="h-20 w-20 rounded-3xl object-cover ring-4 ring-slate-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-3xl font-black text-white">
                  {firstLetter}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-black text-slate-900">حسابي</h1>
                <p className="mt-2 text-slate-500">
                  مرحبًا، {user.displayName || user.phoneNumber || "مستخدم براتشو كار"}
                </p>
              </div>
            </div>

            <button
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800"
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-slate-900">معلومات الحساب</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">الاسم</label>
                <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  {user.displayName || "غير متوفر"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  البريد الإلكتروني
                </label>
                <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  {user.email || "غير متوفر"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">رقم الهاتف</label>
                <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  {user.phoneNumber || "غير متوفر"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-slate-900">حالة الحساب</h2>

            <div className="space-y-4">
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-sm text-slate-500">تسجيل الدخول</p>
                <p className="mt-2 text-lg font-black text-green-700">مفعل</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">المعرف</p>
                <p className="mt-2 break-all text-sm font-bold text-slate-900">
                  {user.uid}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">الرسالة</p>
                <p className="mt-2 text-base font-bold text-slate-800">
                  {message || "تم تحميل الحساب بنجاح."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
