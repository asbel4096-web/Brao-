"use client";

import Image from "next/image";
import {
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Heart,
  Car,
  Award,
  Eye,
  Users,
  Navigation,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getTraderDisplayName,
  normalizeLibyanPhone,
  formatNumber,
} from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { isVerifiedNow } from "@/lib/wallet/verification";
import { useFollowTraderState } from "@/hooks/useListingEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

/**
 * صفحة المعرض - Header احترافي مطابق للتصميم.
 *
 * البنية:
 *  - Cover image مع overlay داكن
 *  - Logo BRATSHO في الوسط فوق الكوفر
 *  - Badge "معرض موثق" في الزاوية العلوية (إن كان موثقاً)
 *  - بطاقة هوية: صورة دائرية + اسم + تقييم + موقع + متابعون
 *  - زر "متابعة" أزرق primary مع قلب
 *  - شريط 4 إحصائيات (سيارات، سنوات، مشاهدات، متابعون)
 *  - 4 أزرار تواصل (مراسلة، اتصال، واتساب، الموقع)
 *
 * Dark-first design: الخلفية slate-950، النصوص بيضاء، الأزرق براند.
 */

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
  const { isFollowing, toggleFollow, isOwnProfile } =
    useFollowTraderState(traderId);
  const [busy, setBusy] = useState(false);

  // التحقق من التوثيق: نظام جديد (verifiedUntil) + قديم (isVerifiedDealer)
  const isVerified =
    isVerifiedNow(profile as any) || profile.isVerifiedDealer === true;

  const displayName = getTraderDisplayName(profile);
  const phone = profile.phone || "";
  const wa = normalizeLibyanPhone(phone);
  const ratingText = Number(averageRating || 0).toFixed(1);

  // مصادر الصور: نُفضّل cover/logo الخاص بالمعرض الموثق
  const cover =
    (isVerified ? profile.dealerCover : null) || profile.coverURL || null;
  const photo =
    (isVerified ? profile.dealerLogo : null) || profile.photoURL || null;

  const followersN = profile.followersCount || 0;

  // السنوات في براتشو
  const yearsInBratsho = (() => {
    const createdAt = (profile as any).createdAt?.toMillis?.();
    if (!createdAt) return 0;
    const years = (Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(1, Math.floor(years));
  })();

  // الإحصائيات
  const viewsCount = (profile as any).viewsCount || 0;
  const totalListings = listingsCount + servicesCount;

  const handleFollow = async () => {
    if (!user) {
      router.push(`/login?redirect=/traders/${traderId}`);
      return;
    }
    if (isOwnProfile) {
      toast.info("لا يمكنك متابعة نفسك");
      return;
    }
    setBusy(true);
    try {
      await toggleFollow();
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ المتابعة");
    } finally {
      setBusy(false);
    }
  };

  const handleCall = () => {
    if (!phone) {
      toast.info("لا يوجد رقم هاتف متاح");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    if (!wa) {
      toast.info("لا يوجد رقم واتساب متاح");
      return;
    }
    window.open(`https://wa.me/${wa.replace(/^\+/, "")}`, "_blank");
  };

  const handleLocation = () => {
    const loc = (profile as any).dealerLocation || profile.location;
    if (!loc) {
      toast.info("لا يوجد موقع محدد");
      return;
    }
    // فتح خرائط جوجل ببحث بسيط
    window.open(
      `https://maps.google.com/?q=${encodeURIComponent(loc)}`,
      "_blank"
    );
  };

  return (
    <article
      className="
        relative overflow-hidden rounded-[28px]
        bg-slate-950 text-white
        shadow-xl
      "
      dir="rtl"
    >
      {/* ============================================================
          1) Cover + Logo + Verified Badge
         ============================================================ */}
      <div className="relative h-44 sm:h-56">
        {/* Cover image */}
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        )}

        {/* Overlay داكن لقراءة الـbadge */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950" />

        {/* Logo BRATSHO وسط الكوفر */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-white/90">
            <Car size={22} strokeWidth={2} />
            <span className="text-xl font-black tracking-wider">BRATSHO</span>
          </div>
          <span className="sr-only">شعار براتشو كار</span>
        </div>

        {/* Verified badge - top-left (RTL = left of screen) */}
        {isVerified && (
          <div className="absolute top-3 left-3">
            <div className="
              flex items-center gap-1.5 rounded-full
              bg-slate-900/80 px-3 py-1.5 backdrop-blur-md
              ring-1 ring-white/10
            ">
              <BadgeCheck
                size={14}
                className="text-blue-400"
                strokeWidth={2.5}
              />
              <span className="text-[11px] font-black text-white">
                معرض موثق
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          2) Identity card (تظهر مرفوعة فوق الكوفر)
         ============================================================ */}
      <div className="relative -mt-12 px-4 pb-4 sm:px-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Photo */}
          <div className="
            relative h-24 w-24 shrink-0 overflow-hidden rounded-full
            bg-slate-800 ring-4 ring-slate-950
            sm:h-28 sm:w-28
          ">
            {photo ? (
              <Image
                src={photo}
                alt={displayName}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1 pt-12 sm:pt-14">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-black text-white sm:text-xl">
                {displayName}
              </h1>
              {isVerified && (
                <BadgeCheck
                  size={18}
                  className="shrink-0 text-blue-400"
                  strokeWidth={2.5}
                  aria-label="موثق"
                />
              )}
            </div>

            {/* Location */}
            {(profile as any).dealerLocation || profile.location ? (
              <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-300">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">
                  {(profile as any).dealerLocation || profile.location}
                </span>
              </div>
            ) : null}

            {/* Rating + Followers row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {reviewsCount > 0 && (
                <div className="flex items-center gap-1 text-[12px]">
                  <Star
                    size={12}
                    className="fill-amber-400 text-amber-400"
                  />
                  <span className="font-black text-white">{ratingText}</span>
                  <span className="text-slate-400">
                    ({formatNumber(reviewsCount)} تقييم)
                  </span>
                </div>
              )}
              {followersN > 0 && (
                <div className="flex items-center gap-1 text-[12px] text-slate-400">
                  <span className="font-black text-white">
                    +{formatNumber(followersN)}
                  </span>
                  <span>متابع</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Follow button (للزوار) / إدارة صفحتي (للمالك) */}
        {!isOwnProfile ? (
          <button
            type="button"
            onClick={handleFollow}
            disabled={busy}
            className={`
              mt-4 inline-flex w-full items-center justify-center gap-1.5
              rounded-2xl py-2.5 text-sm font-black shadow-sm transition
              active:scale-[0.98] disabled:opacity-60
              ${isFollowing
                ? "bg-slate-800 text-white hover:bg-slate-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
              }
            `}
          >
            <Heart
              size={14}
              className={isFollowing ? "fill-current" : ""}
            />
            {busy ? "..." : isFollowing ? "تتم المتابعة" : "متابعة"}
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href="/profile/edit"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-blue-600 py-2.5 text-sm font-black
                text-white shadow-sm transition
                hover:bg-blue-700 active:scale-[0.98]
              "
            >
              <Pencil size={13} />
              تعديل المعرض
            </a>
            <a
              href="/my-listings"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-slate-800 py-2.5 text-sm font-black
                text-white transition hover:bg-slate-700
                active:scale-[0.98]
              "
            >
              <Car size={13} />
              إعلاناتي
            </a>
          </div>
        )}
      </div>

      {/* ============================================================
          3) Stats row (4 boxes)
         ============================================================ */}
      <div className="mx-4 grid grid-cols-4 gap-2 rounded-2xl bg-slate-900/60 p-3 sm:mx-5">
        <StatItem
          icon={Car}
          value={totalListings >= 10 ? `${totalListings}+` : String(totalListings)}
          label="إجمالي السيارات"
        />
        <StatItem
          icon={Award}
          value={String(yearsInBratsho)}
          label="سنوات في براتشو"
        />
        <StatItem
          icon={Eye}
          value={formatViewsK(viewsCount)}
          label="المشاهدات"
        />
        <StatItem
          icon={Users}
          value={formatViewsK(followersN)}
          label="المتابعون"
        />
      </div>

      {/* ============================================================
          4) Contact actions (4 buttons)
         ============================================================ */}
      <div className="mx-4 mt-3 mb-4 grid grid-cols-4 gap-2 sm:mx-5">
        <ContactAction
          icon={MessageCircle}
          label="مراسلة"
          onClick={onMessage}
        />
        <ContactAction
          icon={Phone}
          label="اتصال"
          onClick={handleCall}
          disabled={!phone}
        />
        <ContactAction
          icon={WhatsAppIcon as any}
          label="واتساب"
          onClick={handleWhatsApp}
          disabled={!wa}
        />
        <ContactAction
          icon={Navigation}
          label="الموقع"
          onClick={handleLocation}
        />
      </div>
    </article>
  );
}

// ============================================================
// Helpers
// ============================================================

function StatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon size={16} className="text-blue-400" strokeWidth={2} />
      <span className="text-[15px] font-black tabular-nums text-white sm:text-base">
        {value}
      </span>
      <span className="text-[9px] leading-tight text-slate-400 sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

function ContactAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: any;
  label: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        flex flex-col items-center gap-1.5 rounded-2xl
        bg-slate-900/70 px-2 py-3 transition
        hover:bg-slate-800 active:scale-95
        disabled:cursor-not-allowed disabled:opacity-40
      "
    >
      <Icon size={18} className="text-white" strokeWidth={1.8} />
      <span className="text-[11px] font-bold text-slate-200">{label}</span>
    </button>
  );
}

/** أيقونة WhatsApp SVG مخصصة (لا تتوفر في lucide). */
function WhatsAppIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** صياغة الأرقام بصيغة مختصرة (1.2K, 58K, ...). */
function formatViewsK(n: number): string {
  if (!n || n < 0) return "0";
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K+`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
}
