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
import { auth, googleProvider } from "@/lib/firebase";

const ADMIN_EMAILS = ["asbel4096@gmail.com"];

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState("جارٍ التحقق...");

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setMessage(`تم تسجيل الدخول: ${result.user.email}`);
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
        setMessage("حدث خطأ بعد الرجوع من Google.");
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setMessage(`المستخدم الحالي: ${currentUser.email}`);
      } else {
        setMessage("لا يوجد مستخدم مسجل دخول.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
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

  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-4xl font-black text-slate-900">
          تشخيص لوحة المشرف
        </h1>

        <div className="mb-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">الحالة</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{message}</p>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">جاري التحميل</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {authLoading ? "نعم" : "لا"}
          </p>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">البريد الحالي</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {user?.email || "لا يوجد"}
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">هل هو أدمن؟</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {isAdmin ? "نعم، أدمن" : "لا، ليس أدمن"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white"
            onClick={handleGoogleLogin}
          >
            تسجيل الدخول عبر Google
          </button>

          <button
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800"
            onClick={handleLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </section>
  );
}
