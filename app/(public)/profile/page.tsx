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
import { MEMBERSHIP_OPTIONS } from "@/lib/constants";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", membership: "free", photoURL: "", phone: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [phone, setPhone] = useState("+218");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      const data = snap.exists() ? snap.data() : {};
      setProfileForm({
        name: String(data.name || currentUser.displayName || ""),
        bio: String(data.bio || ""),
        membership: String(data.membership || "free"),
        photoURL: String(data.photoURL || currentUser.photoURL || ""),
        phone: String(data.phone || currentUser.phoneNumber || "")
      });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaContainerRef.current || window.recaptchaVerifier || user) return;

    auth.languageCode = "ar";
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: "normal",
        callback: () => setMessage("تم تفعيل التحقق بنجاح."),
        "expired-callback": () => setMessage("انتهت صلاحية التحقق. أعد المحاولة.")
      });
      window.recaptchaVerifier.render().catch((error) => {
        console.error(error);
        setMessage("فشل تحميل reCAPTCHA.");
      });
    } catch (error) {
      console.error(error);
      setMessage("تعذر تهيئة reCAPTCHA.");
    }
  }, [user]);

  const firstLetter = useMemo(
    () => profileForm.name?.trim()?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U",
    [profileForm.name, user?.email]
  );

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    try {
      setGoogleLoading(true);
      setMessage("");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setMessage("تم تسجيل الدخول عبر Google بنجاح.");
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.code === "auth/popup-blocked"
          ? "اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
          : error?.message || "فشل تسجيل الدخول عبر Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      setMessage("");
      if (!phone.startsWith("+")) return setMessage("اكتب الرقم بصيغة دولية صحيحة.");
      if (!window.recaptchaVerifier) return setMessage("أعد تحميل الصفحة ثم حاول مجددًا.");
      setSendingCode(true);
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setMessage("تم إرسال رمز التحقق إلى الهاتف.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "فشل إرسال رمز التحقق.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      if (!confirmationResult) return setMessage("أرسل الرمز أولًا.");
      setVerifyingCode(true);
      await confirmationResult.confirm(code);
      setMessage("تم تسجيل الدخول برقم الهاتف بنجاح.");
    } catch (error: any) {
      setMessage(error?.message || "رمز غير صحيح أو منتهي.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) setProfileForm((prev) => ({ ...prev, photoURL: URL.createObjectURL(file) }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setProfileSaving(true);
      let photoURL = profileForm.photoURL || user.photoURL || "";
      if (avatarFile) {
        const avatarRef = ref(storage, `users/${user.uid}/avatar-${Date.now()}-${avatarFile.name}`);
        await uploadBytes(avatarRef, avatarFile);
        photoURL = await getDownloadURL(avatarRef);
      }
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: profileForm.name,
          bio: profileForm.bio,
          membership: profileForm.membership,
          photoURL,
          phone: profileForm.phone || user.phoneNumber || "",
          email: user.email || "",
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setProfileForm((prev) => ({ ...prev, photoURL }));
      setMessage("تم حفظ بيانات الحساب بنجاح.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "تعذر حفظ الحساب.");
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) return <section className="container py-10"><div className="card p-8 text-center text-slate-500">جارٍ تحميل الحساب...</div></section>;

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-4xl card p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[28px] bg-slate-100 text-4xl">👤</div>
            <h1 className="text-4xl font-black text-slate-900">حسابي</h1>
            <p className="mt-3 text-lg text-slate-500">سجّل الدخول عبر Google أو رقم الهاتف لإدارة حسابك وإعلاناتك.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6">
              <h2 className="mb-4 text-2xl font-black text-slate-900">تسجيل الدخول عبر Google</h2>
              <p className="mb-5 leading-8 text-slate-600">للدخول السريع وإدارة حسابك وصورتك الشخصية وإعلاناتك.</p>
              <button type="button" className="btn-primary w-full" onClick={handleGoogleLogin} disabled={googleLoading}>{googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}</button>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6">
              <h2 className="mb-4 text-2xl font-black text-slate-900">تسجيل الدخول برقم الهاتف</h2>
              <label className="label">رقم الهاتف</label>
              <input className="input mb-4" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              <button type="button" className="btn-primary mb-4 w-full" onClick={handleSendCode} disabled={sendingCode}>{sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}</button>
              <div className="mb-4 rounded-[22px] border border-slate-200 bg-white p-2"><div ref={recaptchaContainerRef} /></div>
              <label className="label">رمز التحقق</label>
              <input className="input mb-4" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
              <button type="button" className="btn-secondary w-full" onClick={handleVerifyCode} disabled={verifyingCode}>{verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}</button>
            </div>
          </div>
          {message ? <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700">{message}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="card p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {profileForm.photoURL ? (
                <img src={profileForm.photoURL} alt="User" className="h-20 w-20 rounded-[26px] object-cover ring-4 ring-slate-100" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-blue-600 text-3xl font-black text-white">{firstLetter}</div>
              )}
              <div>
                <h1 className="text-3xl font-black text-slate-900">حسابي</h1>
                <p className="mt-2 text-slate-500">مرحبًا، {profileForm.name || user.phoneNumber || user.email || "مستخدم براتشو كار"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/my-listings" className="btn-secondary">إعلاناتي</Link>
              <Link href="/settings" className="btn-secondary">الإعدادات</Link>
              <button type="button" className="btn-secondary" onClick={handleLogout}>تسجيل الخروج</button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-2xl font-black text-slate-900">تعديل حسابي</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">الصورة الشخصية</label>
                <input type="file" accept="image/*" className="input pt-3" onChange={handleAvatarChange} />
              </div>
              <div>
                <label className="label">الاسم</label>
                <input className="input" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">السيرة الذاتية</label>
                <textarea className="input min-h-[120px]" value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} placeholder="اكتب نبذة عنك أو عن نشاطك" />
              </div>
              <div>
                <label className="label">رقم الهاتف</label>
                <input className="input" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">نوع العضوية</label>
                <select className="input" value={profileForm.membership} onChange={(e) => setProfileForm((prev) => ({ ...prev, membership: e.target.value }))}>
                  {MEMBERSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <button type="button" className="btn-primary" onClick={handleSaveProfile} disabled={profileSaving}>{profileSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl font-black text-slate-900">معلومات الحساب</h2>
            <div className="mt-5 space-y-4">
              <div><label className="label">البريد الإلكتروني</label><div className="input flex items-center">{user.email || "غير متوفر"}</div></div>
              <div><label className="label">رقم الهاتف</label><div className="input flex items-center">{profileForm.phone || user.phoneNumber || "غير متوفر"}</div></div>
              <div><label className="label">نوع العضوية</label><div className="input flex items-center">{MEMBERSHIP_OPTIONS.find((option) => option.value === profileForm.membership)?.label || "مجاني"}</div></div>
              <div><label className="label">المعرّف</label><div className="input flex items-center text-xs sm:text-sm">{user.uid}</div></div>
              <div><label className="label">السيرة الذاتية</label><div className="input min-h-[120px] items-start py-3">{profileForm.bio || "لا توجد سيرة ذاتية بعد."}</div></div>
            </div>
          </div>
        </div>

        {message ? <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{message}</div> : null}
      </div>
    </section>
  );
}
