"use client";

import Image from "next/image";
import {
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTraderDisplayName, normalizeLibyanPhone, formatNumber } from "@/lib/utils";
import { onlineStatusText, isProfileOnline } from "@/lib/online";
import type { UserProfile } from "@/lib/types";
import { useFollowTraderState } from "@/hooks/useListingEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface TraderProfileHeaderProps {
  traderId: string;
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  onMessage: () => Promise<void> | void;
}

export function TraderProfileHeader({
  traderId,
  profile,
  listingsCount,
  servicesCount,
  averageRating,
  reviewsCount,
  onMessage,
}: TraderProfileHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { isFollowing, toggleFollow, isOwnProfile } = useFollowTraderState(traderId);
  const [busy, setBusy] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const displayName = getTraderDisplayName(profile);
  const phone = profile.phone || "";
  const wa = normalizeLibyanPhone(phone);
  const online = isProfileOnline(profile);
  const statusText = onlineStatusText(profile);
  const ratingText = Number(averageRating || 0).toFixed(1);

  // مصادر البيانات حسب نوع البروفايل
  const isVerified = profile.isVerifiedDealer === true;
  const cover = (isVerified ? profile.dealerCover : null) || profile.coverURL || null;
  const photo = (isVerified ? profile.dealerLogo : null) || profile.photoURL || null;
  const bioText = ((isVerified ? profile.dealerBio : null) || profile.bio || "").trim();
  const followersN = profile.followersCount || 0;
  const bioIsLong = bioText.length > 140;
  const bioVisible = bioExpanded || !bioIsLong ? bioText : bioText.slice(0, 140) + "…";

  const handleFollow = async () => {
    if (!user) {
      toast.info("سجّل الدخول أولاً لمتابعة التاجر.");
      router.push(`/login?redirect=/traders/${traderId}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggleFollow();
      toast.success(isFollowing ? "تم إلغاء متابعة التاجر." : "تمت متابعة التاجر.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحديث المتابعة.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/traders/${traderId}`
        : "";
    const title = `${displayName} - براتشو كار`;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط البروفايل.");
      }
    } catch {
      /* المستخدم ألغى أو فشل nav.share */
    }
  };

  return (
    <section className="card overflow-hidden">
      {/* ============== الغلاف ============== */}
      <div className="relative h-36 w-full overflow-hidden sm:h-52">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-l from-brand-800 via-brand-700 to-action-500" />
        )}
        {/* تدرّج سفلي خفيف لقراءة أفضل للشعار المتراكب */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"
        />
      </div>

      <div className="relative px-4 pb-5 sm:px-6 sm:pb-6">
        {/* ============== الشعار + الاسم + المعلومات ============== */}
        <div className="-mt-12 flex flex-col items-start gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-end">
            {/* الشعار الدائري */}
            <div className="relative shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl dark:border-slate-900 dark:bg-slate-900 sm:h-28 sm:w-28">
                {photo ? (
                  <Image
                    src={photo}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500 text-3xl font-black text-white">
                    {displayName.charAt(0)}
                  </div>
                )}
              </div>
              {/* شارة التوثيق - للموثَّقين فقط */}
              {isVerified && (
                <span
                  aria-label="معرض موثق"
                  className="absolute -bottom-1 -left-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white shadow-md dark:border-slate-900"
                >
                  <BadgeCheck size={15} strokeWidth={2.5} />
                </span>
              )}
            </div>

            {/* الاسم + معلومات سريعة */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-2xl">
                  {displayName}
                </h1>
                {isVerified && (
                  <BadgeCheck
                    size={18}
                    strokeWidth={2.5}
                    className="text-brand-700 dark:text-brand-300"
                    aria-label="موثَّق"
                  />
                )}
              </div>

              {/* سطر إحصائيات مدمج بنمط Facebook */}
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {formatNumber(listingsCount)}
                </span>
                <span>إعلان</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {formatNumber(followersN)}
                </span>
                <span>متابع</span>
                {servicesCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {formatNumber(servicesCount)}
                    </span>
                    <span>خدمة</span>
                  </>
                )}
                {reviewsCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">{ratingText}</span>
                      <span className="text-slate-400 dark:text-slate-500">({formatNumber(reviewsCount)})</span>
                    </span>
                  </>
                )}
              </div>

              {/* صف ثانٍ: مدينة + حالة الاتصال */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                {profile.city && (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin size={11} />
                    {profile.city}
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      online ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {statusText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============== النبذة ============== */}
        {bioText && (
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-200">
            {bioVisible}
            {bioIsLong && (
              <button
                type="button"
                onClick={() => setBioExpanded((v) => !v)}
                className="me-1 font-black text-brand-700 hover:underline dark:text-brand-300"
              >
                {bioExpanded ? "أقل" : "عرض المزيد"}
              </button>
            )}
          </p>
        )}

        {/* ============== شريط الأزرار ============== */}
        <div className="mt-4 flex flex-wrap gap-2">
          {!isOwnProfile && (
            <button
              type="button"
              onClick={() => void handleFollow()}
              disabled={busy}
              className={`inline-flex h-11 flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-2xl text-sm font-black transition active:scale-95 disabled:opacity-60 sm:flex-none sm:px-5 ${
                isFollowing
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "bg-brand-700 text-white shadow-blue hover:bg-brand-600"
              }`}
            >
              {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {isFollowing ? "إلغاء المتابعة" : "متابعة"}
            </button>
          )}

          <button
            type="button"
            onClick={() => void onMessage()}
            className="inline-flex h-11 flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-2xl bg-action-500 text-sm font-black text-white shadow-action transition active:scale-95 hover:bg-action-600 sm:flex-none sm:px-5"
          >
            <MessageCircle size={16} />
            مراسلة
          </button>

          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="اتصال"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Phone size={16} />
            </a>
          )}

          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              aria-label="واتساب"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white transition active:scale-95 hover:bg-emerald-600"
            >
              <MessageCircle size={16} />
            </a>
          )}

          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="مشاركة"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
