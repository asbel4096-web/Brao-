"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  browserLocalPersistence,
  ConfirmationResult,
  onAuthStateChanged,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, googleProvider, storage } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
  }
}

type ProfileData = {
  bio: string;
  photoURL: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const [phone, setPhone] = useState("+218");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!mounted) return;

          setUser(currentUser);

          if (currentUser) {
            try {
              const userRef = doc(db, "users", currentUser.uid);

              await setDoc(
                userRef,
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

              const snap = await getDoc(userRef);
              const data = snap.data() as Partial<ProfileData> | undefined;
              setBio(data?.bio || "");
              setPhotoURL(data?.photoURL || currentUser.photoURL || "");
            } catch (error) {
              console.error("Save/load user error:", error);
            }
          }

          setLoading(false);
        });

        return unsubscribe;
      } catch (error: any) {
        console.error("Auth init error:", error);
        setMessage(error?.message || "تعذر تهيئة تسجيل الدخول.");
        setLoading(false);
        return () => {};
      }
    };

    let unsubscribeFn: (() => void) | undefined;

    init().then((unsub) => {
      unsubscribeFn = unsub || undefined;
    });

    return () => {
      mounted = false;
      if (unsubscribeFn) unsubscribeFn();
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaContainerRef.current) return;
    if (user) return;

    const setupRecaptcha = async () => {
      try {
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch {}
          window.recaptchaVerifier = undefined;
        }

        auth.languageCode = "ar";

        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current!,
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

        await window.recaptchaVerifier.render();
      } catch (error: any) {
        console.error("reCAPTCHA init error:", error);
        setMessage(error?.message || "تعذر تهيئة reCAPTCHA.");
      }
    };

    setupRecaptcha();
  }, [user]);

  const firstLetter = useMemo(() => {
    return (
      user?.displayName?.trim()?.charAt(0)?.toUpperCase() ||
      user?.email?.trim()?.charAt(0)?.toUpperCase() ||
      user?.phoneNumber?.trim()?.charAt(0)?.toUpperCase() ||
      "U"
    );
  }, [user]);

  const previewPhoto = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    return photoURL;
  }, [photoFile, photoURL]);

  const handleGoogleLogin = async () => {
    if (googleLoading) return;

    try {
      setGoogleLoading(true);
      setMessage("");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setMessage("تم تسجيل الدخول عبر Google بنجاح.");
    } catch (error: any) {
      console.error("Google login error:", error);

      if (error?.code === "auth/popup-blocked") {
        setMessage("المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
      } else if (error?.code === "auth/cancelled-popup-request") {
        setMessage("اضغط مرة واحدة فقط على تسجيل Google.");
      } else if (error?.code === "auth/popup-closed-by-user") {
        setMessage("تم إغلاق نافذة Google قبل إكمال تسجيل الدخول.");
      } else {
        setMessage(error?.message || "فشل تسجيل الدخول عبر Google.");
      }
    } finally {
      setGoogleLoading(false);
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
        setMessage("reCAPTCHA غير جاهز بعد. أعد تحميل الصفحة وانتظر ظهوره.");
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
      setMessage("تم إرسال رمز التحقق. إذا تأخر، انتظر قليلًا ثم أعد المحاولة.");
    } catch (error: any) {
      console.error("Send code error:", error);
      setMessage(
        error?.message ||
          "فشل إرسال رمز التحقق. تأكد من الرقم وظهور reCAPTCHA والدومين المصرح به."
      );

      try {
        const widgetId = await window.recaptchaVerifier?.render();
        if (window.grecaptcha && widgetId !== undefined) {
          window.grecaptcha.reset(widgetId);
        }
      } catch {}
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

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSavingProfile(true);
      setMessage("جارٍ حفظ بيانات الحساب...");

      let finalPhotoURL = photoURL;

      if (photoFile) {
        const fileName = `${Date.now()}-${photoFile.name}`;
        const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
        await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          bio: bio.trim(),
          photoURL: finalPhotoURL,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setPhotoURL(finalPhotoURL);
      setPhotoFile(null);
      setMessage("تم حفظ بيانات الحساب بنجاح.");
    } catch (error) {
      console.error("Save profile error:", error);
      setMessage("حدث خطأ أثناء حفظ الحساب.");
    } finally {
      setSavingProfile(false);
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
      <section className="container pb-8">
        <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                سجّل الدخول لإدارة إعلاناتك ورسائلك وحسابك.
              </p>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                تسجيل الدخول عبر Google
              </h2>

              <button
                type="button"
                className="mt-5 w-full rounded-[22px] bg-[#2F49C8] px-5 py-4 text-lg font-black text-white"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
              </button>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                تسجيل الدخول برقم الهاتف
              </h2>

              <label className="mt-5 mb-2 block text-sm font-bold text-slate-500">
                رقم الهاتف
              </label>
              <input
                className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2189xxxxxxxx"
                dir="ltr"
              />

              <button
                type="button"
                className="mt-4 w-full rounded-[18px] bg-slate-900 px-5 py-3 font-black text-white"
                onClick={handleSendCode}
                disabled={sendingCode}
              >
                {sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
              </button>

              <div className="mt-4">
                <div
                  ref={recaptchaContainerRef}
                  className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <label className="mt-4 mb-2 block text-sm font-bold text-slate-500">
                رمز التحقق
              </label>
              <input
                className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="اكتب الكود"
                dir="ltr"
              />

              <button
                type="button"
                className="mt-4 w-full rounded-[18px] border border-blue-200 bg-blue-50 px-5 py-3 font-black text-blue-700"
                onClick={handleVerifyCode}
                disabled={verifyingCode}
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
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/my-listings"
                className="rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                إعلاناتي
              </Link>
              <Link
                href="/settings"
                className="rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                الإعدادات
              </Link>
              <button
                type="button"
                className="rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                onClick={handleLogout}
              >
                تسجيل الخروج
              </button>
            </div>

            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                حسابي
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                إدارة بيانات الحساب.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              تعديل الحساب
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  الصورة الشخصية
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  السيرة الذاتية
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="اكتب نبذة مختصرة عنك أو عن نشاطك"
                  className="w-full rounded-[20px] bg-slate-100 px-4 py-4 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="w-full rounded-[22px] bg-[#2F49C8] px-5 py-4 text-lg font-black text-white disabled:opacity-60"
              >
                {savingProfile ? "جارٍ حفظ الحساب..." : "حفظ تعديل الحساب"}
              </button>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              معلومات الحساب
            </h2>

            <div className="mt-5 grid gap-4">
              <div className="flex items-center justify-between gap-4 rounded-[22px] bg-slate-50 p-4 dark:bg-slate-800">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-950 dark:text-white">
                    {user.displayName || "غير متوفر"}
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    {user.email || "غير متوفر"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    {user.phoneNumber || "غير متوفر"}
                  </div>
                </div>

                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt="User"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2F49C8] text-3xl font-black text-white">
                    {firstLetter}
                  </div>
                )}
              </div>

              <div className="rounded-[22px] bg-slate-50 p-4 text-right dark:bg-slate-800">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-300">
                  السيرة الذاتية
                </div>
                <div className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
                  {bio || "لا توجد سيرة ذاتية بعد."}
                </div>
              </div>
            </div>
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
