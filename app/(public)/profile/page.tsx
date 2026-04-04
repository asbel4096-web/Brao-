"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            },
            { merge: true }
          );

          const snap = await getDoc(userRef);
          const data = snap.data() as Partial<ProfileData> | undefined;

          setBio(data?.bio || "");
          setPhotoURL(data?.photoURL || currentUser.photoURL || "");
        } catch (error) {
          console.error("Load user profile error:", error);
        }
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaContainerRef.current) return;
    if (window.recaptchaVerifier || user) return;

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

      window.recaptchaVerifier.render().catch(() => {
        setMessage("فشل تحميل reCAPTCHA.");
      });
    } catch (error) {
      console.error("reCAPTCHA init error:", error);
      setMessage("تعذر تهيئة reCAPTCHA.");
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

      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        setMessage("تم تسجيل الدخول عبر Google بنجاح.");
      }
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
      setMessage("تم إرسال رمز التحقق. إذا تأخر، انتظر قليلًا ثم أعد المحاولة.");
    } catch (error: any) {
      console.error("Send code error:", error);
      setMessage(
        error?.message ||
          "فشل إرسال رمز التحقق. تأكد من الرقم، reCAPTCHA، والدومين المصرح به في Firebase."
      );
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
                <button
                  type="button"
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-60"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
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
                  type="button"
                  className="mb-4 w-full rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-60"
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
                  type="button"
                  className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700 disabled:opacity-60"
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
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {previewPhoto ? (
                <img
                  src={previewPhoto}
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

            <div className="flex flex-wrap gap-3">
              <Link
                href="/my-listings"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"
              >
                إعلاناتي
              </Link>
              <Link
                href="/settings"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"
              >
                الإعدادات
              </Link>
              <button
                type="button"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"
                onClick={handleLogout}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-black text-slate-900">تعديل الحساب</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  الصورة الشخصية
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                />
              </div>

              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-black text-white disabled:opacity-60"
              >
                {savingProfile ? "جارٍ حفظ الحساب..." : "حفظ تعديل الحساب"}
              </button>
            </div>
          </div>

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
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  رقم الهاتف
                </label>
                <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  {user.phoneNumber || "غير متوفر"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">
                  السيرة الذاتية
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                  {bio || "لا توجد سيرة ذاتية بعد."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
