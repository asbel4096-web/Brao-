"use client";

import { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setMessage("تم تسجيل الدخول بنجاح.");
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
        setMessage("حدث خطأ أثناء إكمال تسجيل الدخول.");
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
              photoURL: currentUser.photoURL || "",
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

  const handleGoogleLogin = async () => {
    try {
      setMessage("");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      setMessage("فشل بدء تسجيل الدخول.");
      alert("فشل تسجيل الدخول.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage("تم تسجيل الخروج.");
    } catch (error) {
      console.error("Logout error:", error);
      setMessage("فشل تسجيل الخروج.");
    }
  };

  if (loading) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8 text-center text-slate-500">
          جارٍ تحميل الحساب...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
              👤
            </div>
            <h1 className="section-title">حسابي</h1>
            <p className="section-subtitle">
              سجّل الدخول عبر Google لإدارة حسابك وإعلاناتك.
            </p>
          </div>

          <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="mb-5 text-slate-600">
              تسجيل الدخول يتيح لك متابعة إعلاناتك وحفظ بياناتك داخل الموقع.
            </p>

            <button className="btn btn-primary w-full" onClick={handleGoogleLogin}>
              تسجيل الدخول عبر Google
            </button>

            {message ? (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const firstLetter =
    user.displayName?.trim()?.charAt(0)?.toUpperCase() ||
    user.email?.trim()?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="card p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="h-20 w-20 rounded-3xl object-cover ring-4 ring-slate-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-3xl font-black text-white">
                  {firstLetter}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-black text-slate-900">حسابي</h1>
                <p className="mt-2 text-slate-500">مرحبًا، {user.displayName || "مستخدم براتشو كار"}</p>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-5 text-2xl font-black text-slate-900">معلومات الحساب</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">الاسم</label>
                <div className="input flex items-center">
                  {user.displayName || "غير متوفر"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">البريد الإلكتروني</label>
                <div className="input flex items-center">
                  {user.email || "غير متوفر"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">معرّف المستخدم</label>
                <div className="input flex items-center text-sm">
                  {user.uid}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-5 text-2xl font-black text-slate-900">حالة الحساب</h2>

            <div className="space-y-4">
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-sm text-slate-500">تسجيل الدخول</p>
                <p className="mt-2 text-lg font-black text-green-700">مفعل</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">طريقة الدخول</p>
                <p className="mt-2 text-lg font-black text-slate-900">Google</p>
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

        <div className="card p-6">
          <h2 className="mb-4 text-2xl font-black text-slate-900">ملاحظة</h2>
          <p className="text-slate-600 leading-8">
            هذه الصفحة جاهزة لتسجيل المستخدم عبر Google وعرض بياناته. الخطوة التالية
            ستكون ربط الإعلانات بالمستخدم الحالي حتى يظهر لكل مستخدم إعلاناته داخل حسابه.
          </p>
        </div>
      </div>
    </section>
  );
}
