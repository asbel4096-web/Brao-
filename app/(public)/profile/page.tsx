"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  browserSessionPersistence,
  ConfirmationResult,
  onAuthStateChanged,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, googleProvider, storage } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    grecaptcha?: { reset: (widgetId?: number) => void };
  }
}

type UserProfileForm = {
  displayName: string;
  phone: string;
  bio: string;
  membership: "مجاني" | "مدفوع";
  photoURL: string;
};

const emptyProfile: UserProfileForm = {
  displayName: "",
  phone: "",
  bio: "",
  membership: "مجاني",
  photoURL: ""
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [profileForm, setProfileForm] = useState<UserProfileForm>(emptyProfile);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        const profileData = snap.exists() ? snap.data() : {};

        const nextForm: UserProfileForm = {
          displayName: currentUser.displayName || profileData.name || "",
          phone: currentUser.phoneNumber || profileData.phone || "",
          bio: profileData.bio || "",
          membership: profileData.membership === "مدفوع" ? "مدفوع" : "مجاني",
          photoURL: currentUser.photoURL || profileData.photoURL || ""
        };

        setProfileForm(nextForm);
        setAvatarPreview(nextForm.photoURL || "");

        await setDoc(userRef, {
          uid: currentUser.uid,
          name: nextForm.displayName,
          email: currentUser.email || "",
          phone: nextForm.phone,
          photoURL: nextForm.photoURL,
          bio: nextForm.bio,
          membership: nextForm.membership,
          providerIds: currentUser.providerData.map((p) => p.providerId),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !recaptchaContainerRef.current || window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: "normal" });
    window.recaptchaVerifier.render().catch(() => setMessage("تعذر تحميل reCAPTCHA."));
  }, []);

  useEffect(() => {
    if (!selectedAvatar) return;
    const url = URL.createObjectURL(selectedAvatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedAvatar]);

  const firstLetter = useMemo(() => profileForm.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U", [profileForm.displayName, user?.email]);

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    try {
      setGoogleLoading(true);
      setMessage("");
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) setMessage("تم تسجيل الدخول عبر Google بنجاح.");
    } catch (error: any) {
      if (error?.code === "auth/popup-blocked") setMessage("المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
      else if (error?.code === "auth/cancelled-popup-request") setMessage("تم إرسال طلبين معًا. اضغط مرة واحدة فقط.");
      else setMessage(error?.message || "فشل تسجيل الدخول عبر Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      setMessage("");
      if (!phone.trim().startsWith("+")) return setMessage("اكتب الرقم بصيغة دولية مثل +2189xxxxxxxx.");
      if (!window.recaptchaVerifier) return setMessage("reCAPTCHA غير جاهز بعد.");
      setSendingCode(true);
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInWithPhoneNumber(auth, phone.trim(), window.recaptchaVerifier);
      setConfirmationResult(result);
      setMessage("تم إرسال رمز التحقق إلى الهاتف.");
    } catch (error: any) {
      setMessage(error?.message || "فشل إرسال رمز التحقق.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      if (!confirmationResult) return setMessage("أرسل رمز التحقق أولًا.");
      if (!code.trim()) return setMessage("اكتب رمز التحقق.");
      setVerifyingCode(true);
      await confirmationResult.confirm(code.trim());
      setMessage("تم تسجيل الدخول برقم الهاتف بنجاح.");
      setCode("");
    } catch (error: any) {
      setMessage(error?.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedAvatar(file);
  };

  const handleProfileChange = (field: keyof UserProfileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value as UserProfileForm[keyof UserProfileForm] }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSavingProfile(true);
      setMessage("");

      let photoURL = profileForm.photoURL;
      if (selectedAvatar) {
        const avatarRef = ref(storage, `users/${user.uid}/profile-${Date.now()}-${selectedAvatar.name.replace(/\s+/g, "-")}`);
        await uploadBytes(avatarRef, selectedAvatar);
        photoURL = await getDownloadURL(avatarRef);
      }

      await updateProfile(user, {
        displayName: profileForm.displayName,
        photoURL
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: profileForm.displayName,
        email: user.email || "",
        phone: profileForm.phone,
        photoURL,
        bio: profileForm.bio,
        membership: profileForm.membership,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setProfileForm((prev) => ({ ...prev, photoURL }));
      setSelectedAvatar(null);
      setMessage("تم تحديث الحساب بنجاح.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "حدث خطأ أثناء تحديث الحساب.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setConfirmationResult(null);
    setCode("");
    setMessage("تم تسجيل الخروج.");
  };

  if (loading) return <section className="container py-10"><div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">جارٍ تحميل الحساب...</div></section>;

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl dark:bg-slate-800">👤</div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white">حسابي</h1>
              <p className="mt-3 text-lg text-slate-500 dark:text-slate-300">سجّل الدخول عبر Google أو رقم الهاتف لإدارة حسابك وإعلاناتك.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950">
                <h2 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">تسجيل الدخول عبر Google</h2>
                <button type="button" className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white" onClick={handleGoogleLogin} disabled={googleLoading}>
                  {googleLoading ? "جارٍ فتح Google..." : "تسجيل الدخول عبر Google"}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950">
                <h2 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">تسجيل الدخول برقم الهاتف</h2>
                <label className="mb-2 block text-sm font-bold text-slate-500">رقم الهاتف</label>
                <input className="mb-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2189xxxxxxxx" dir="ltr" />
                <button type="button" className="mb-4 w-full rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white" onClick={handleSendCode} disabled={sendingCode}>{sendingCode ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}</button>
                <div className="mb-4"><div ref={recaptchaContainerRef} className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2" /></div>
                <label className="mb-2 block text-sm font-bold text-slate-500">رمز التحقق</label>
                <input className="mb-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={code} onChange={(e) => setCode(e.target.value)} placeholder="اكتب الكود" dir="ltr" />
                <button type="button" className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700" onClick={handleVerifyCode} disabled={verifyingCode}>{verifyingCode ? "جارٍ التحقق..." : "تأكيد الكود وتسجيل الدخول"}</button>
              </div>
            </div>

            {message ? <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</div> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {avatarPreview ? <img src={avatarPreview} alt="User" className="h-20 w-20 rounded-3xl object-cover ring-4 ring-slate-100" /> : <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-3xl font-black text-white">{firstLetter}</div>}
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">حسابي</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-300">مرحبًا، {profileForm.displayName || user.phoneNumber || "مستخدم براتشو كار"}</p>
                <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">عضوية الحساب: {profileForm.membership}</div>
              </div>
            </div>
            <button type="button" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white" onClick={handleLogout}>تسجيل الخروج</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-5 text-2xl font-black text-slate-900 dark:text-white">تعديل حسابي</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">الصورة الشخصية</label>
                <input type="file" accept="image/*" className="input cursor-pointer" onChange={handleAvatarChange} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">الاسم</label>
                <input className="input" value={profileForm.displayName} onChange={(e) => handleProfileChange("displayName", e.target.value)} placeholder="اسم المستخدم" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">رقم الهاتف</label>
                <input className="input" value={profileForm.phone} onChange={(e) => handleProfileChange("phone", e.target.value)} placeholder="+218... أو 09..." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">السيرة الذاتية</label>
                <textarea className="input min-h-[130px]" value={profileForm.bio} onChange={(e) => handleProfileChange("bio", e.target.value)} placeholder="اكتب نبذة قصيرة عنك أو عن نشاطك." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">نوع العضوية</label>
                <select className="input" value={profileForm.membership} onChange={(e) => handleProfileChange("membership", e.target.value)}>
                  <option value="مجاني">مجاني</option>
                  <option value="مدفوع">مدفوع</option>
                </select>
              </div>
              <button type="button" className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? "جارٍ حفظ الحساب..." : "حفظ التعديلات"}</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-5 text-2xl font-black text-slate-900 dark:text-white">معلومات الحساب</h2>
              <div className="space-y-4">
                <Info label="الاسم" value={profileForm.displayName || "غير متوفر"} />
                <Info label="البريد الإلكتروني" value={user.email || "غير متوفر"} />
                <Info label="رقم الهاتف" value={profileForm.phone || user.phoneNumber || "غير متوفر"} />
                <Info label="السيرة الذاتية" value={profileForm.bio || "غير متوفرة"} />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-5 text-2xl font-black text-slate-900 dark:text-white">حالة الحساب</h2>
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">تم تسجيل الدخول بنجاح.</div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-500">طريقة تسجيل الدخول</label>
                  <div className="flex flex-wrap gap-2">
                    {user.providerData.length ? user.providerData.map((provider, index) => <span key={`${provider.providerId}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{provider.providerId}</span>) : null}
                  </div>
                </div>
                {message ? <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</div> : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/my-listings" className="card p-5 transition hover:border-brand-200"><div className="text-xl font-black dark:text-white">إعلاناتي</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">عرض، تعديل، وحذف الإعلانات الخاصة بك.</p></Link>
              <Link href="/settings" className="card p-5 transition hover:border-brand-200"><div className="text-xl font-black dark:text-white">الإعدادات</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">إدارة الحساب والوضع الليلي وروابط التحكم.</p></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-500">{label}</label>
      <div className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}
