"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  LogOut, Settings, Heart, MessageCircle, ListChecks, Shield, Bell,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.displayName || "");
      setBio(profile.bio || "");
      setPhone(profile.phone || user?.phoneNumber || "");
      setPhotoURL(profile.photoURL || user?.photoURL || "");
    }
  }, [profile, user]);

  const previewPhoto = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    return photoURL;
  }, [photoFile, photoURL]);

  useEffect(() => {
    return () => {
      if (photoFile && previewPhoto) URL.revokeObjectURL(previewPhoto);
    };
  }, [photoFile, previewPhoto]);

  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      setError("الصورة يجب أن تكون أقل من 5 ميجابايت.");
      return;
    }
    setError("");
    setPhotoFile(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const safeName = photoFile.name.replace(/\s+/g, "-");
        const fileRef = ref(
          storage,
          `users/${user.uid}/${Date.now()}-${safeName}`
        );
        await uploadBytes(fileRef, photoFile, { contentType: photoFile.type });
        finalPhotoURL = await getDownloadURL(fileRef);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: name.trim(),
          email: user.email || "",
          phone: phone.trim() || user.phoneNumber || "",
          bio: bio.trim(),
          photoURL: finalPhotoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // also reflect on auth profile
      try {
        await updateProfile(user, {
          displayName: name.trim() || user.displayName || "",
          photoURL: finalPhotoURL || user.photoURL || "",
        });
      } catch {
        /* non-fatal */
      }

      setPhotoURL(finalPhotoURL);
      setPhotoFile(null);
      await refreshProfile();
      setMessage("تم حفظ بيانات الحساب بنجاح.");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Save profile error:", err);
      setError(err?.message || "حدث خطأ أثناء حفظ الحساب.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", err);
      setError(err?.message || "فشل تسجيل الخروج.");
    }
  };

  if (loading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {previewPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewPhoto}
                  alt={name || "user"}
                  className="h-20 w-20 rounded-3xl object-cover ring-4 ring-slate-100 dark:ring-slate-800"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-700 text-3xl font-black text-white">
                  {initial}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                    {name || "مستخدم براتشو كار"}
                  </h1>
                  {isAdmin && (
                    <span className="badge-action !text-xs">
                      <Shield size={12} className="ml-1" /> مشرف
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  {user.email || user.phoneNumber || "حساب جديد"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </button>
          </div>

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/my-listings" className="card p-4 text-center hover:border-brand-300 transition">
              <ListChecks size={22} className="mx-auto text-brand-700" />
              <div className="mt-2 text-sm font-bold dark:text-white">إعلاناتي</div>
            </Link>
            <Link href="/favorites" className="card p-4 text-center hover:border-rose-300 transition">
              <Heart size={22} className="mx-auto text-rose-600" />
              <div className="mt-2 text-sm font-bold dark:text-white">المفضلة</div>
            </Link>
            <Link href="/messages" className="card p-4 text-center hover:border-brand-300 transition">
              <MessageCircle size={22} className="mx-auto text-brand-700" />
              <div className="mt-2 text-sm font-bold dark:text-white">الرسائل</div>
            </Link>
            <Link href="/notifications" className="card p-4 text-center hover:border-action-300 transition">
              <Bell size={22} className="mx-auto text-action-600" />
              <div className="mt-2 text-sm font-bold dark:text-white">الإشعارات</div>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Edit form */}
          <div className="card p-6">
            <h2 className="text-xl font-black mb-5 dark:text-white">تعديل الحساب</h2>
            <div className="space-y-4">
              <div>
                <label className="label">الصورة الشخصية</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="input file:ml-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold dark:file:bg-slate-800 dark:file:text-white"
                />
                <p className="mt-1 text-xs text-slate-500">حد أقصى 5 ميجابايت.</p>
              </div>
              <div>
                <label className="label">الاسم</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك أو اسم نشاطك التجاري"
                />
              </div>
              <div>
                <label className="label">رقم الهاتف</label>
                <input
                  className="input"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                />
              </div>
              <div>
                <label className="label">السيرة الذاتية</label>
                <textarea
                  rows={5}
                  className="input min-h-[120px] resize-y"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="نبذة مختصرة عنك أو نشاطك (اختياري)"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>

          {/* Info read-only */}
          <div className="card p-6">
            <h2 className="text-xl font-black mb-5 dark:text-white">معلومات الحساب</h2>
            <div className="space-y-3 text-sm">
              <Row label="معرف الحساب" value={user.uid} mono />
              <Row label="البريد الإلكتروني" value={user.email || "—"} />
              <Row label="هاتف Firebase" value={user.phoneNumber || "—"} />
              <Row label="آخر دخول" value={user.metadata?.lastSignInTime || "—"} />
              <div className="pt-2">
                <Link href="/settings" className="btn-secondary w-full">
                  <Settings size={16} /> الإعدادات
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : "text-slate-800 dark:text-slate-200"}>
        {value}
      </span>
    </div>
  );
}
