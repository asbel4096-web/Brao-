"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ListChecks,
  LogOut,
  Pencil,
  Settings,
  Shield,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";

/**
 * صفحة الملف الشخصي - أُعيد ترتيبها:
 *
 * - Header مدمج (h-20 → h-16، p-8 → p-5) ليكون موبايل-friendly
 * - Quick actions اختصرت إلى 2 فقط: إعلاناتي + الإعدادات
 *   (المفضلة/الرسائل/الإشعارات موجودة في bottom-nav والـ header)
 * - زر "إدارة" يظهر للأدمن فقط
 * - تسجيل الخروج بـ confirm dialog (حماية من النقر بالخطأ)
 * - الشبكة تُكدَّس عمودياً على الموبايل (تعديل ثم معلومات)
 * - حذف uid/lastSignInTime - معلومات تقنية لا تفيد المستخدم العادي
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, refreshProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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
      toast.error("الصورة يجب أن تكون أقل من 5 ميجابايت.");
      return;
    }
    setPhotoFile(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const safeName = photoFile.name.replace(/\s+/g, "-");
        const fileRef = ref(
          storage,
          `users/${user.uid}/${Date.now()}-${safeName}`
        );
        await uploadBytes(fileRef, photoFile, {
          contentType: photoFile.type,
        });
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
      toast.success("تم حفظ بياناتك بنجاح.");
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "تسجيل الخروج؟",
      message: "ستحتاج لإعادة تسجيل الدخول لاحقاً للوصول إلى حسابك.",
      confirmText: "تسجيل الخروج",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await signOut(auth);
      router.replace("/");
    } catch (err: any) {
      toast.error(err?.message || "فشل تسجيل الخروج.");
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
    <section className="container py-4 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        {/* ============== Header مدمج ============== */}
        <div className="card overflow-hidden p-0">
          <div
            className="
              relative bg-gradient-to-l from-brand-700 to-brand-800
              px-5 pb-12 pt-5 text-white sm:px-6 sm:pt-6
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                ملفي الشخصي
              </div>
              {isAdmin && (
                <span
                  className="
                    inline-flex items-center gap-1 rounded-full
                    bg-action-500 px-2.5 py-1 text-[10px] font-black
                    text-white shadow-action
                  "
                >
                  <Shield size={11} />
                  مشرف
                </span>
              )}
            </div>
          </div>

          {/* الصورة + الاسم - تتداخل مع الـ gradient */}
          <div className="-mt-12 px-5 pb-5 sm:px-6">
            <div className="flex items-end gap-4">
              {previewPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewPhoto}
                  alt={name || "user"}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 shrink-0 rounded-3xl border-4 border-white object-cover shadow-card dark:border-slate-900 sm:h-24 sm:w-24"
                />
              ) : (
                <div
                  className="
                    flex h-20 w-20 shrink-0 items-center justify-center
                    rounded-3xl border-4 border-white
                    bg-gradient-to-br from-brand-700 to-brand-500
                    text-2xl font-black text-white shadow-card
                    dark:border-slate-900 sm:h-24 sm:w-24 sm:text-3xl
                  "
                >
                  {initial}
                </div>
              )}
            </div>

            <div className="mt-3">
              <h1 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                {name || "مستخدم براتشو كار"}
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                {user.email || user.phoneNumber || "حساب جديد"}
              </p>
            </div>
          </div>
        </div>

        {/* ============== Quick actions - 2 إلى 3 فقط ============== */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <QuickActionCard
            href="/my-listings"
            icon={ListChecks}
            label="إعلاناتي"
            color="brand"
          />
          <QuickActionCard
            href="/settings"
            icon={Settings}
            label="الإعدادات"
            color="slate"
          />
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className="
              flex items-center justify-between gap-3 rounded-3xl
              border-2 border-action-200 bg-action-50/50 p-4
              transition active:scale-[0.99]
              hover:border-action-300 hover:bg-action-50
              dark:border-action-700/60 dark:bg-action-950/30
              dark:hover:bg-action-950/50
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-2xl bg-action-500 text-white shadow-action
                "
              >
                <Shield size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  لوحة الإدارة
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  إدارة الإعلانات والمستخدمين
                </div>
              </div>
            </div>
            <span className="text-action-700 dark:text-action-300">←</span>
          </Link>
        )}

        {/* ============== Edit form ============== */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Pencil size={16} className="text-brand-700 dark:text-brand-300" />
            <h2 className="text-base font-black text-slate-950 dark:text-white sm:text-lg">
              تعديل البيانات
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">الصورة الشخصية</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="
                  input file:ml-3 file:rounded-full file:border-0
                  file:bg-slate-100 file:px-4 file:py-2 file:font-bold
                  file:text-slate-700 dark:file:bg-slate-800
                  dark:file:text-white
                "
              />
              <p className="mt-1 text-[11px] text-slate-500">
                حد أقصى 5 ميجابايت.
              </p>
            </div>

            <div>
              <label className="label">الاسم أو اسم النشاط</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك أو اسم نشاطك التجاري"
                maxLength={60}
              />
            </div>

            <div>
              <label className="label">رقم الهاتف</label>
              <input
                className="input"
                dir="ltr"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
              />
            </div>

            <div>
              <label className="label">السيرة الذاتية</label>
              <textarea
                rows={4}
                className="input min-h-[100px] resize-y"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="نبذة مختصرة عنك أو نشاطك (اختياري)"
                maxLength={500}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {bio.length}/500
              </p>
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

        {/* ============== تسجيل الخروج ============== */}
        <button
          type="button"
          onClick={handleLogout}
          className="
            inline-flex w-full items-center justify-center gap-2
            rounded-3xl border-2 border-rose-200 bg-rose-50/50
            px-4 py-3.5 text-sm font-black text-rose-700
            transition active:scale-[0.99]
            hover:bg-rose-50 hover:border-rose-300
            dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300
            dark:hover:bg-rose-950/40
          "
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </section>
  );
}

/* ============================================================
 * Quick action card
 * ============================================================ */
function QuickActionCard({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: typeof ListChecks;
  label: string;
  color: "brand" | "slate";
}) {
  const colorClasses =
    color === "brand"
      ? "text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/40"
      : "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800";

  return (
    <Link
      href={href}
      className="
        flex items-center gap-3 rounded-2xl border border-slate-200/70
        bg-white p-3.5 transition-all
        hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card
        active:scale-[0.97]
        dark:border-slate-700/70 dark:bg-slate-900
        dark:hover:border-brand-700
      "
    >
      <div
        className={`
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-xl ${colorClasses}
        `}
      >
        <Icon size={18} />
      </div>
      <span className="text-sm font-black text-slate-900 dark:text-white">
        {label}
      </span>
    </Link>
  );
}
