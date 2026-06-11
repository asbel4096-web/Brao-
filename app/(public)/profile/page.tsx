"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Camera,
  ChevronLeft,
  Copy,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Share2,
  Shield,
  ShieldCheck,
  Star,
  Store,
  Eye,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { isVerifiedNow } from "@/lib/wallet/verification";

/**
 * صفحة الملف الشخصي - تصميم احترافي مستلهَم من الصورتين 5+6:
 *
 * - بطاقة مستخدم كبيرة (header) فيها:
 *     - صورة + اسم + شارة "موثَّق" + شارة "مشرف"
 *     - رقم العضوية + تاريخ الانضمام + تقييم
 *     - زرّا "إدارة الحساب" + "تعديل البيانات"
 *
 * - 4 إحصائيات سريعة (إعلاناتي / المفضلة / الرسائل / المشاهدات)
 * - أقسام مرتّبة في cards (إدارتي / إعدادات / دعم وتواصل / إدارة - للأدمن فقط)
 * - زر تسجيل الخروج في الأسفل
 */

interface Stats {
  listings: number;
  favorites: number;
  unreadChats: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [stats, setStats] = useState<Stats>({
    listings: 0,
    favorites: 0,
    unreadChats: 0,
  });

  /* ----------------------------------------------------------
   * رفع صورة الغلاف
   * ---------------------------------------------------------- */
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handlePickCover = () => coverInputRef.current?.click();

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // اسمح بإعادة اختيار نفس الملف لاحقاً
    if (!file || !user) return;

    // قيود بسيطة: 5MB كحد أعلى، نوع صورة فقط — متوافق مع storage.rules.
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة فقط.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الحجم الأعلى للغلاف 5 ميجابايت.");
      return;
    }

    try {
      setUploadingCover(true);
      const path = `users/${user.uid}/cover-${Date.now()}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file, { contentType: file.type });
      const url = await getDownloadURL(sref);
      await updateDoc(doc(db, "users", user.uid), {
        coverURL: url,
        updatedAt: serverTimestamp(),
      });
      toast.success("تم تحديث صورة الغلاف.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر رفع الغلاف.");
    } finally {
      setUploadingCover(false);
    }
  };

  /* ----------------------------------------------------------
   * Auth guard
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  /* ----------------------------------------------------------
   * Stats - مؤجَّلة لتفادي تأخير LCP
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    let unsubListings: (() => void) | null = null;
    let unsubFavorites: (() => void) | null = null;
    let unsubChats: (() => void) | null = null;
    let cancelled = false;

    const startSubscriptions = () => {
      if (cancelled) return;

      // الإعلانات
      unsubListings = onSnapshot(
        query(collection(db, "listings"), where("ownerId", "==", user.uid)),
        (snap) => setStats((s) => ({ ...s, listings: snap.size })),
        () => {/* تجاهل */}
      );

      // المفضلة
      unsubFavorites = onSnapshot(
        collection(db, "users", user.uid, "favorites"),
        (snap) => setStats((s) => ({ ...s, favorites: snap.size })),
        () => {/* تجاهل */}
      );

      // المحادثات غير المقروءة
      unsubChats = onSnapshot(
        query(
          collection(db, "chats"),
          where("participants", "array-contains", user.uid)
        ),
        (snap) => {
          let count = 0;
          snap.forEach((d) => {
            const data = d.data() as any;
            const c = data?.unreadCount?.[user.uid];
            if (typeof c === "number") count += c;
          });
          setStats((s) => ({ ...s, unreadChats: count }));
        },
        () => {/* تجاهل */}
      );
    };

    if (
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
    ) {
      const id = (window as any).requestIdleCallback(startSubscriptions, {
        timeout: 2000,
      });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
        unsubListings?.();
        unsubFavorites?.();
        unsubChats?.();
      };
    } else {
      const t = setTimeout(startSubscriptions, 600);
      return () => {
        cancelled = true;
        clearTimeout(t);
        unsubListings?.();
        unsubFavorites?.();
        unsubChats?.();
      };
    }
  }, [user]);

  /* ----------------------------------------------------------
   * Logout مع confirm
   * ---------------------------------------------------------- */
  const handleLogout = async () => {
    const ok = await confirm({
      title: "تسجيل الخروج؟",
      message: "ستحتاج لإعادة تسجيل الدخول للوصول إلى حسابك.",
      
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

  const handleCopyUid = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      toast.success("تم نسخ رقم الحساب.");
    } catch {
      toast.info(`رقم الحساب: ${user.uid.slice(0, 12)}…`);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    const url = `${window.location.origin}/traders/${user.uid}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile?.name || "صفحتي على براتشو كار",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط حسابك.");
      }
    } catch {
      /* المستخدم ألغى المشاركة */
    }
  };

  /* ----------------------------------------------------------
   * Loading / not authed
   * ---------------------------------------------------------- */
  if (loading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  const name =
    profile?.name ||
    user.displayName ||
    user.email ||
    user.phoneNumber ||
    "مستخدم براتشو كار";
  const initial = name.charAt(0).toUpperCase();
  const isPhoneVerified = !!user.phoneNumber || !!profile?.phone;
  const memberSince = formatJoinDate(profile?.createdAt);
  const accountNumber = user.uid.slice(-8).toUpperCase();
  const rating = Number(profile?.averageRating || 0);
  const ratingsCount = Number(profile?.ratingsCount || 0);

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        {/* ============================================================
            بطاقة المستخدم - Header الرئيسي
           ============================================================ */}
        <div className="card overflow-hidden p-0">
          {/* غلاف Bratsho Car: صورة مرفوعة إن وُجدت، وإلا نمط براتشو الافتراضي */}
          <div
            className="
              relative h-28 overflow-hidden
              bg-gradient-to-l from-brand-700 via-brand-800 to-ink
              sm:h-36
            "
          >
            {profile?.coverURL ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.coverURL}
                  alt="غلاف الحساب"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* تظليل بسيط لضمان قراءة الأزرار فوق أي صورة */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"
                />
              </>
            ) : (
              <>
                {/* النمط الافتراضي بهوية براتشو */}
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute -top-10 -right-10 h-44 w-44
                    rounded-full bg-brand-400/25 blur-2xl
                  "
                />
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute -bottom-12 -left-12 h-44 w-44
                    rounded-full bg-action-500/15 blur-2xl
                  "
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute left-4 top-1/2 -translate-y-1/2
                    select-none text-[56px] font-black leading-none text-white/[0.06]
                    sm:left-6 sm:text-[72px]
                  "
                >
                  BC
                </div>
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute bottom-3 left-4 hidden
                    items-center gap-1.5 sm:flex
                  "
                >
                  <span className="text-[11px] font-black tracking-wider text-white/70">
                    BRATSHO CAR
                  </span>
                  <span className="h-1 w-1 rounded-full bg-action-500" />
                </div>
              </>
            )}

            {/* زر تغيير الغلاف */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleCoverChange}
            />
            <button
              type="button"
              onClick={handlePickCover}
              disabled={uploadingCover}
              aria-label={profile?.coverURL ? "تغيير صورة الغلاف" : "إضافة صورة غلاف"}
              className="
                absolute right-3 top-3 z-10 inline-flex h-8 items-center gap-1
                rounded-full border border-white/20 bg-black/40 px-2 text-white
                backdrop-blur transition hover:bg-black/60 active:scale-95
                disabled:opacity-60
                sm:h-9 sm:gap-1.5 sm:px-2.5
              "
            >
              {uploadingCover ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              {/* النص يظهر على sm+ فقط حتى لا يزاحم الغلاف على الهاتف */}
              <span className="hidden text-[11px] font-black sm:inline">
                {uploadingCover ? "جارٍ الرفع..." : profile?.coverURL ? "تغيير الغلاف" : "إضافة غلاف"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="مشاركة الحساب"
              className="
                absolute left-3 top-3 z-10 inline-flex h-9 w-9
                items-center justify-center rounded-full border
                border-white/20 bg-black/30 text-white backdrop-blur
                transition hover:bg-black/50 active:scale-95
              "
            >
              <Share2 size={16} />
            </button>
          </div>

          {/* الصورة تتداخل مع الغلاف بشكل أنيق (ليس مرتفعة جداً) */}
          <div className="px-5 pb-5 sm:px-6">
            <div className="relative z-10 -mt-10 flex items-end gap-4 sm:-mt-12">
              {profile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoURL}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 shrink-0 rounded-3xl border-4 border-white object-cover shadow-card dark:border-slate-900 sm:h-28 sm:w-28"
                />
              ) : (
                <div
                  className="
                    flex h-24 w-24 shrink-0 items-center justify-center
                    rounded-3xl border-4 border-white
                    bg-gradient-to-br from-brand-700 to-brand-500
                    text-3xl font-black text-white shadow-card
                    dark:border-slate-900 sm:h-28 sm:w-28 sm:text-4xl
                  "
                >
                  {initial}
                </div>
              )}
            </div>

            {/* الاسم + الشارات - قريب من الصورة */}
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                  {name}
                </h1>
                {isPhoneVerified && (
                  <ShieldCheck
                    size={18}
                    className="text-brand-700 dark:text-brand-300"
                    aria-label="رقم موثَّق"
                  />
                )}
                {isAdmin && (
                  <span
                    className="
                      inline-flex items-center gap-1 rounded-full
                      bg-action-500 px-2.5 py-0.5 text-[10px] font-black
                      text-white shadow-action
                    "
                  >
                    <Shield size={11} />
                    مشرف
                  </span>
                )}
              </div>

              {/* التقييم */}
              {ratingsCount > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-sm">
                  <Star
                    size={14}
                    className="fill-current text-amber-500"
                    aria-hidden="true"
                  />
                  <span className="font-black text-slate-900 dark:text-white">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({ratingsCount} تقييم)
                  </span>
                </div>
              )}
            </div>

            {/* معلومات العضوية */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyUid}
                className="
                  flex items-center justify-between gap-2 rounded-2xl
                  border border-slate-200 bg-slate-50 px-3 py-2
                  text-right transition active:scale-[0.98]
                  hover:border-brand-300 hover:bg-brand-50/30
                  dark:border-slate-700 dark:bg-slate-950/40
                  dark:hover:border-brand-700 dark:hover:bg-brand-950/30
                "
                aria-label="نسخ رقم الحساب"
              >
                <Copy
                  size={12}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    رقم الحساب
                  </div>
                  <div
                    dir="ltr"
                    className="truncate text-right font-mono text-xs font-black text-slate-900 dark:text-white"
                  >
                    {accountNumber}
                  </div>
                </div>
              </button>

              <div
                className="
                  rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2
                  dark:border-slate-700 dark:bg-slate-950/40
                "
              >
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  عضو منذ
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {memberSince}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/profile/complete?redirect=/profile"
                className="
                  inline-flex items-center justify-center gap-1.5
                  rounded-2xl border border-slate-200 bg-white
                  px-3 py-2.5 text-xs font-black text-slate-700
                  transition active:scale-[0.98]
                  hover:border-brand-300 hover:bg-brand-50/30
                  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
                "
              >
                <Pencil size={14} />
                تعديل البيانات
              </Link>
              <Link
                href="/settings"
                className="
                  inline-flex items-center justify-center gap-1.5
                  rounded-2xl border border-slate-200 bg-white
                  px-3 py-2.5 text-xs font-black text-slate-700
                  transition active:scale-[0.98]
                  hover:border-brand-300 hover:bg-brand-50/30
                  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
                "
              >
                <SettingsIcon size={14} />
                إدارة الحساب
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================
            تنبيه توثيق الهاتف (لو لم يكن موثَّقاً)
           ============================================================ */}
        {!isPhoneVerified && (
          <Link
            href="/verify-phone?redirect=/profile"
            className="
              flex items-center justify-between gap-3 rounded-3xl
              border-2 border-amber-200 bg-amber-50/60 p-4
              transition active:scale-[0.99]
              hover:border-amber-300 hover:bg-amber-50
              dark:border-amber-800 dark:bg-amber-950/30
              dark:hover:bg-amber-950/50
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-2xl bg-amber-500 text-white shadow-sm
                "
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  وثّق رقم هاتفك
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  لزيادة ثقة المشترين بإعلاناتك
                </div>
              </div>
            </div>
            <ChevronLeft
              size={18}
              className="shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
          </Link>
        )}

        {/* ============================================================
            إحصائيات سريعة - 3 بطاقات
           ============================================================ */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            href="/my-listings"
            icon={FileText}
            value={stats.listings}
            label="إعلاناتي"
            color="brand"
          />
          <StatCard
            href="/favorites"
            icon={Bookmark}
            value={stats.favorites}
            label="المفضلة"
            color="rose"
          />
          <StatCard
            href="/messages"
            icon={MessageSquare}
            value={stats.unreadChats}
            label="رسائل"
            color="action"
            badge={stats.unreadChats > 0}
          />
        </div>

        {/* ============================================================
            الإدارة - كرت للأدمن فقط
           ============================================================ */}
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
                  flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-2xl bg-action-500 text-white shadow-action
                "
              >
                <Shield size={20} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  لوحة الإدارة
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  إدارة الإعلانات والمستخدمين
                </div>
              </div>
            </div>
            <ChevronLeft
              size={18}
              className="shrink-0 text-action-700 dark:text-action-300"
              aria-hidden="true"
            />
          </Link>
        )}

        {/* ============================================================
            بطاقة "صفحة معرضي" - للمعارض الموثَّقة فقط.
            تربط صاحب المعرض بصفحته العامة بضغطة واحدة.
           ============================================================ */}
        {user && profile && (isVerifiedNow(profile as any) || profile?.isVerifiedDealer) && (
          <Link
            href={`/traders/${user.uid}`}
            className="
              group relative flex items-center gap-3 overflow-hidden
              rounded-3xl border-2 border-blue-500/30 bg-gradient-to-l
              from-blue-50 via-blue-50/40 to-white p-3.5
              transition active:scale-[0.99] hover:border-blue-500
              dark:border-blue-800/50 dark:from-blue-900/30
              dark:via-blue-900/10 dark:to-slate-900
              dark:hover:border-blue-700
            "
          >
            <div
              className="
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700
                text-white shadow-lg shadow-blue-500/30
              "
            >
              <Store size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-950 dark:text-white">
                  صفحة معرضي
                </span>
                <BadgeCheck
                  size={14}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <div className="mt-0.5 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                شاهد كيف يظهر معرضك للزوار
              </div>
            </div>
            <div className="
              flex items-center gap-1 rounded-full
              bg-white/80 px-2.5 py-1
              dark:bg-slate-900/80
            ">
              <Eye size={11} className="text-blue-700 dark:text-blue-300" />
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-300">
                معاينة
              </span>
            </div>
          </Link>
        )}

        {/* زر تعديل المعرض - للموثقين (يفتح صفحة التحرير بالتابات) */}
        {user && profile && (isVerifiedNow(profile as any) || profile?.isVerifiedDealer) && (
          <Link
            href="/profile/edit"
            className="
              flex items-center gap-3 rounded-3xl border border-slate-200
              bg-white p-3.5 transition active:scale-[0.99]
              hover:border-blue-300 hover:bg-blue-50/30
              dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700
            "
          >
            <div className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-2xl bg-blue-50 text-blue-600
              dark:bg-blue-900/30 dark:text-blue-400
            ">
              <Pencil size={18} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black text-slate-950 dark:text-white">
                تعديل المعرض
              </span>
              <div className="mt-0.5 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                اللوجو، الغلاف، معرض الصور، القصص
              </div>
            </div>
            <ChevronLeft size={16} className="shrink-0 text-slate-400" />
          </Link>
        )}

        {/* ============================================================
            بطاقة توثيق المعرض - تظهر للمستخدم غير الموثَّق فقط.
            من وثّق معرضه لا يرى الدعوة (لا فائدة منها).
           ============================================================ */}
        {!profile?.isVerifiedDealer && !isVerifiedNow(profile as any) && (
          <Link
            href="/dealer-verification"
            className="
              group relative flex items-center gap-3 overflow-hidden
              rounded-3xl border border-brand-200/70 bg-gradient-to-l
              from-brand-50 via-brand-50/60 to-white p-3.5
              transition active:scale-[0.99] hover:border-brand-300
              dark:border-brand-800/40 dark:from-brand-900/30
              dark:via-brand-900/10 dark:to-slate-900
              dark:hover:border-brand-700
            "
          >
            <div
              className="
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-2xl bg-brand-700 text-white shadow-blue
                transition group-hover:bg-brand-600
              "
            >
              <BadgeCheck size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950 dark:text-white">
                وثّق معرضك
              </div>
              <div className="text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                ارفع ثقة العملاء واظهر ضمن معارض السيارات الموثقة.
              </div>
            </div>
            <ChevronLeft
              size={18}
              className="shrink-0 text-brand-700 dark:text-brand-300"
              aria-hidden="true"
            />
          </Link>
        )}

        {/* ============================================================
            القائمة - الأقسام الرئيسية
           ============================================================ */}
        <div
          className="
            overflow-hidden rounded-3xl border border-slate-200/70 bg-white
            dark:border-slate-700/70 dark:bg-slate-900
          "
        >
          <MenuRow
            href="/add-listing"
            icon={Plus}
            label="أضف إعلان جديد"
            color="action"
          />
          <MenuRow
            href="/alerts"
            icon={Bell}
            label="تنبيهات سياراتي"
            color="brand"
          />
          <MenuRow
            href="/notifications"
            icon={Bell}
            label="الإشعارات"
          />
          <MenuRow
            href="/vehicle-report"
            icon={FileText}
            label="تقرير المركبة (VIN)"
          />
          <MenuRow
            href="/contact"
            icon={MessageSquare}
            label="الدعم والتواصل"
            isLast
          />
        </div>

        {/* ============================================================
            تسجيل الخروج
           ============================================================ */}
        <button
          type="button"
          onClick={handleLogout}
          className="
            inline-flex w-full items-center justify-center gap-2
            rounded-3xl border-2 border-rose-200 bg-rose-50/50
            px-4 py-3.5 text-sm font-black text-rose-700
            transition active:scale-[0.99]
            hover:border-rose-300 hover:bg-rose-50
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
 * Sub-components
 * ============================================================ */

function StatCard({
  href,
  icon: Icon,
  value,
  label,
  color,
  badge,
}: {
  href: string;
  icon: typeof FileText;
  value: number;
  label: string;
  color: "brand" | "rose" | "action";
  badge?: boolean;
}) {
  const colorClasses = {
    brand: "text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/40",
    rose: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/40",
    action: "text-action-600 bg-action-50 dark:text-action-300 dark:bg-action-900/40",
  };

  return (
    <Link
      href={href}
      className="
        relative flex flex-col items-center gap-1.5 rounded-2xl border
        border-slate-200/70 bg-white p-3 transition-all
        hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card
        active:scale-[0.97]
        dark:border-slate-700/70 dark:bg-slate-900
        dark:hover:border-brand-700
        sm:p-4
      "
    >
      <div
        className={`
          flex h-10 w-10 items-center justify-center rounded-xl
          ${colorClasses[color]}
        `}
      >
        <Icon size={18} />
      </div>
      <div className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
        {value.toLocaleString("ar-LY")}
      </div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-[11px]">
        {label}
      </div>

      {badge && (
        <span
          className="
            absolute right-2 top-2 inline-flex h-2 w-2
            rounded-full bg-action-500
          "
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  color = "neutral",
  isLast,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  color?: "neutral" | "action" | "brand";
  isLast?: boolean;
}) {
  const iconColor =
    color === "action"
      ? "text-action-600 bg-action-50 dark:bg-action-900/40 dark:text-action-300"
      : color === "brand"
      ? "text-brand-700 bg-brand-50 dark:bg-brand-900/40 dark:text-brand-300"
      : "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300";

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3.5 transition
        hover:bg-slate-50 active:bg-slate-100
        dark:hover:bg-slate-950/40 dark:active:bg-slate-950/60
        ${!isLast ? "border-b border-slate-100 dark:border-slate-800" : ""}
      `}
    >
      <div
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center
          rounded-xl ${iconColor}
        `}
      >
        <Icon size={16} />
      </div>
      <span className="flex-1 text-sm font-bold text-slate-900 dark:text-white">
        {label}
      </span>
      <ChevronLeft
        size={16}
        className="shrink-0 text-slate-400"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */
function formatJoinDate(timestamp: any): string {
  if (!timestamp?.toDate) return "—";
  try {
    const date = timestamp.toDate() as Date;
    return new Intl.DateTimeFormat("ar-LY", {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}
