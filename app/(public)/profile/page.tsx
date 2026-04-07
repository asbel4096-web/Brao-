"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  Bell,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCircle2
} from "lucide-react";
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
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaRef.current) return;
    if (user) return;

    let cancelled = false;

    const initRecaptcha = async () => {
      try {
        setRecaptchaReady(false);
        setMessage("");

        await setPersistence(auth, browserLocalPersistence);
        auth.languageCode = "ar";

        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch {}
          window.recaptchaVerifier = undefined;
        }

        recaptchaRef.current!.innerHTML = "";

        const verifier = new RecaptchaVerifier(auth, recaptchaRef.current!, {
          size: "normal",
          callback: () => {
            if (!cancelled) {
              setRecaptchaReady(true);
              setMessage("تم تفعيل reCAPTCHA بنجاح.");
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
            error?.message ||
              "تعذر تهيئة reCAPTCHA. تحقق من الدومين أو أعد تحميل الصفحة."
          );
        }
      }
    };

    const timer = setTimeout(() => {
      initRecaptcha();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
        setMessage("reCAPTCHA غير جاهز بعد. انتظر قليلًا أو أعد تحميل الصفحة.");
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
      <section className="container pb-32">
        <div className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          جارٍ تحميل الحساب...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container pb-32">
        <div className="grid gap-5">
          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-[#04103A] via-[#071B63] to-[#233C9B] text-white shadow-[0_24px_60px_rgba(25,45,120,0.25)] dark:border-slate-800">
            <div className="relative p-6 md:p-8">
              <div className="absolute left-5 top-5 rounded-2xl bg-white/10 p-3 backdrop-blur">
                <Sparkles className="h-6 w-6 text-[#F58233]" />
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
                  <ShieldCheck className="h-4 w-4 text-[#F58233]" />
                  دخول آمن وسريع
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
                  حسابك في
                  <br />
                  براتشو كار
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
                  سجّل الدخول عبر Google أو رقم الهاتف لإدارة الإعلانات
                  والمحادثات والمفضلة داخل التطبيق.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3 md:max-w-xl">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
                    <div className="text-2xl font-black">+25K</div>
                    <div className="mt-1 text-xs text-white/75">إعلان</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
                    <div className="text-2xl font-black">أسرع</div>
                    <div className="mt-1 text-xs text-white/75">تواصل</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
                    <div className="text-2xl font-black">آمن</div>
                    <div className="mt-1 text-xs text-white/75">تسجيل</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#2F49C8]/10">
                  <UserCircle2 className="h-7 w-7 text-[#2F49C8]" />
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    تسجيل عبر Google
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    دخول سريع ومباشر للحساب
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-right text-sm leading-7 text-slate-500 dark:text-slate-300">
                  مناسب لتفعيل الحساب بسرعة وربط الإعلانات والمحادثات والمفضلة بنفس المستخدم.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="mt-5 w-full rounded-[22px] bg-[#2F49C8] px-5 py-4 text-lg font-black text-white shadow-[0_14px_30px_rgba(47,73,200,0.24)]"
                >
                  {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#F58233]/10">
                  <Smartphone className="h-7 w-7 text-[#F58233]" />
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    تسجيل برقم الهاتف
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    مناسب للمستخدمين داخل ليبيا
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-slate-500">
                    رقم الهاتف
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+218912345678"
                    dir="ltr"
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-left text-base outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div
                    ref={recaptchaRef}
                    id="recaptcha-container"
                    className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-[18px] bg-white p-2 dark:bg-slate-950"
                  />
                </div>

                <div
                  className={`rounded-[18px] px-4 py-3 text-center text-sm font-black ${
                    recaptchaReady
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                  }`}
                >
                  {recaptchaReady ? "reCAPTCHA جاهز" : "reCAPTCHA غير جاهز بعد"}
                </div>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="w-full rounded-[22px] bg-slate-950 px-5 py-4 text-lg font-black text-white dark:bg-white dark:text-slate-950"
                >
                  {sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
                </button>

                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-slate-500">
                    رمز التحقق
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="اكتب الكود"
                    dir="ltr"
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-left text-base outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode}
                  className="w-full rounded-[22px] bg-[#F58233] px-5 py-4 text-lg font-black text-white shadow-[0_14px_30px_rgba(245,130,51,0.22)]"
                >
                  {verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">
                <ShieldCheck className="h-6 w-6 text-[#2F49C8]" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                حماية الحساب
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                تسجيل آمن مع دعم Google والهاتف لحفظ بيانات المستخدم والمحادثات.
              </p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-slate-800">
                <Bell className="h-6 w-6 text-[#F58233]" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                متابعة الإشعارات
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                بعد تسجيل الدخول ستتمكن من متابعة الرسائل وتنبيهات الإعلانات والحساب.
              </p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-slate-800">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                إدارة كاملة
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                إعلاناتك، مفضلاتك، حسابك، ومحادثاتك ستكون كلها تحت نفس الحساب.
              </p>
            </div>
          </section>

          {message ? (
            <div className="rounded-[22px] bg-slate-100 px-4 py-4 text-center text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="container pb-32">
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-[#04103A] via-[#071B63] to-[#233C9B] text-white shadow-[0_24px_60px_rgba(25,45,120,0.25)] dark:border-slate-800">
          <div className="p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-[16px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>

              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 text-[#F58233]" />
                  تم تسجيل الدخول
                </div>

                <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
                  أهلاً بك في
                  <br />
                  براتشو كار
                </h1>

                <p className="mt-3 text-sm leading-7 text-white/80 md:text-base">
                  حسابك جاهز الآن لإدارة الإعلانات والرسائل والمفضلة.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-[#071133] p-5 text-white shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
              <UserCircle2 className="h-12 w-12 text-[#3E5BFF]" />
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-black">
                {user.displayName || "مستخدم براتشو"}
              </h2>
              <p className="mt-2 text-base text-white/75">
                {user.email || user.phoneNumber || "لا توجد بيانات إضافية"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] bg-white/10 p-4 text-center">
              <div className="text-2xl font-black text-[#3E5BFF]">حساب</div>
              <div className="mt-1 text-xs text-white/70">موثق</div>
            </div>

            <div className="rounded-[22px] bg-white/10 p-4 text-center">
              <div className="text-2xl font-black text-[#F58233]">جاهز</div>
              <div className="mt-1 text-xs text-white/70">للإعلانات</div>
            </div>

            <div className="rounded-[22px] bg-white/10 p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">آمن</div>
              <div className="mt-1 text-xs text-white/70">محفوظ</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <a
            href="/my-listings"
            className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                إعلاناتي
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                إدارة كل إعلاناتك المنشورة والمعلقة من مكان واحد.
              </div>
            </div>
          </a>

          <a
            href="/messages"
            className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                الدردشة
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                راجع رسائلك ومحادثاتك مع المشترين والبائعين.
              </div>
            </div>
          </a>

          <a
            href="/favorites"
            className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                المفضلة
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                احتفظ بالإعلانات التي تريد الرجوع لها بسرعة.
              </div>
            </div>
          </a>

          <a
            href="/notifications"
            className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                الإشعارات
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">
                تابع آخر الرسائل وتنبيهات الإعلانات والحساب.
              </div>
            </div>
          </a>
        </section>

        {message ? (
          <div className="rounded-[22px] bg-slate-100 px-4 py-4 text-center text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
