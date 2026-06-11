"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Star,
  Users,
  Car,
  Award,
  ChevronLeft,
} from "lucide-react";
import {
  getTraderDisplayName,
  formatNumber,
  normalizeLibyanPhone,
} from "@/lib/utils";
import { VerificationBadge } from "@/components/verification/verification-badge";
import type { UserProfile } from "@/lib/types";
import { isVerifiedNow } from "@/lib/wallet/verification";
import { useFollowTraderState } from "@/hooks/useListingEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDealerStories } from "@/hooks/dealer/use-dealer-stories";
import { STORY_CATEGORIES, type StoryCategory } from "@/lib/dealer/stories";

/**
 * Trader Profile Header v3 - تصميم احترافي مطابق للصورة.
 *
 * الأقسام:
 *  1) Cover image + أزرار عائمة (back/share/more/bell) + badge "معرض موثق"
 *  2) بطاقة الهوية: logo + اسم + موقع + تقييم + متابعين
 *  3) زرّان: متابعة (أزرق) + مراسلة (أبيض)
 *  4) شريط 4 إحصائيات داخل بطاقة بيضاء
 *  5) Stories rings (4 تصنيفات + زر إضافة للمالك)
 *  6) Tabs sticky عند التمرير
 *
 * Mobile-first بـRTL كامل.
 * يستخدم framer-motion للحركات الناعمة (Spring, parallax خفيف).
 */

interface Props {
  traderId: string;
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  onMessage: () => Promise<void> | void;
  onStoryOpen?: (category: StoryCategory) => void;
  onAddStory?: () => void;
  unreadNotifications?: number;
}

export function TraderProfileHeader({
  traderId,
  profile,
  listingsCount,
  servicesCount,
  averageRating,
  reviewsCount,
  onMessage,
  onStoryOpen,
  onAddStory,
  unreadNotifications = 0,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { isFollowing, toggleFollow, isOwnProfile } =
    useFollowTraderState(traderId);
  const { categoryRings } = useDealerStories(profile.uid);
  const [busy, setBusy] = useState(false);

  // Parallax خفيف للـcover
  const coverRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 300], [0, 60]);
  const coverScale = useTransform(scrollY, [-100, 0], [1.15, 1]);

  const isVerified =
    isVerifiedNow(profile as any) || profile.isVerifiedDealer === true;
  const displayName = getTraderDisplayName(profile);
  const phone = profile.phone || "";

  const cover =
    (isVerified ? profile.dealerCover : null) || profile.coverURL || null;
  const photo =
    (isVerified ? profile.dealerLogo : null) || profile.photoURL || null;
  const followersN = profile.followersCount || 0;
  const ratingText = Number(averageRating || 0).toFixed(1);

  // السنوات في براتشو
  const yearsInBratsho = (() => {
    const createdAt = (profile as any).createdAt?.toMillis?.();
    if (!createdAt) return 0;
    const years = (Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(1, Math.floor(years));
  })();

  const viewsCount = (profile as any).viewsCount || 0;
  const totalListings = listingsCount + servicesCount;

  const handleFollow = async () => {
    if (!user) {
      router.push(`/login?redirect=/traders/${traderId}`);
      return;
    }
    if (isOwnProfile) return;
    setBusy(true);
    try {
      await toggleFollow();
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ المتابعة");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/traders/${traderId}`;
    const text = `${displayName} على براتشو كار`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        /* المستخدم ألغى */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.info("شارك الرابط: " + url);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <article className="relative" dir="rtl">
      {/* ============================================================
          Cover + Floating buttons
         ============================================================ */}
      <div
        ref={coverRef}
        className="relative h-[280px] overflow-hidden sm:h-[320px]"
      >
        {/* Cover image with parallax */}
        <motion.div
          style={{ y: coverY, scale: coverScale }}
          className="absolute inset-0"
        >
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
          )}
          {/* Gradient overlay (لقراءة الأزرار + الـbadge) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        </motion.div>

        {/* Floating top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          {/* Right side (RTL = right) */}
          <div className="flex items-center gap-2">
            <FloatingButton icon={ChevronRight} onClick={handleBack} aria-label="رجوع" />
            <FloatingButton icon={Share2} onClick={handleShare} aria-label="مشاركة" />
            <FloatingButton icon={MoreHorizontal} aria-label="المزيد" />
          </div>

          {/* Left side (RTL = left) */}
          <Link
            href="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg backdrop-blur transition active:scale-95"
            aria-label="الإشعارات"
          >
            <Bell size={16} strokeWidth={2.2} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
        </div>

        {/* Verified badge (bottom-right of cover) - النوع يُستنتَج تلقائياً */}
        {isVerified && (
          <div className="absolute bottom-4 right-4 z-10">
            <div className="rounded-full bg-white/95 px-1 py-0.5 shadow-lg backdrop-blur">
              <VerificationBadge user={profile} size="md" />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          Content (sits on white background)
         ============================================================ */}
      <div className="relative -mt-6 rounded-t-[28px] bg-white px-4 pb-2 pt-4 dark:bg-slate-950 sm:px-5">
        {/* Identity row */}
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="relative -mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-slate-100 ring-4 ring-white shadow-xl dark:bg-slate-800 dark:ring-slate-950 sm:h-28 sm:w-28">
            {photo ? (
              <Image
                src={photo}
                alt={displayName}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-3xl font-black text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + info column */}
          <div className="min-w-0 flex-1 pt-2">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                {displayName}
              </h1>
              {isVerified && (
                <BadgeCheck
                  size={18}
                  className="shrink-0 text-blue-600 dark:text-blue-400"
                  strokeWidth={2.5}
                  aria-label="موثق"
                />
              )}
            </div>

            {/* Location */}
            {((profile as any).dealerLocation || (profile as any).location) && (
              <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">
                  {(profile as any).dealerLocation ||
                    (profile as any).location}
                </span>
              </div>
            )}

            {/* Rating + followers preview */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {reviewsCount > 0 && (
                <div className="flex items-center gap-1 text-[12px]">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="font-black text-slate-900 dark:text-white">
                    {ratingText}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({formatNumber(reviewsCount)} تقييم)
                  </span>
                </div>
              )}
              {followersN > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <FollowersStack count={Math.min(4, followersN)} />
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    +{formatNumber(followersN)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        {!isOwnProfile ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              onClick={handleFollow}
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              className={`
                inline-flex items-center justify-center gap-1.5
                rounded-2xl py-3 text-sm font-black shadow-lg transition
                disabled:opacity-60
                ${isFollowing
                  ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                  : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700"
                }
              `}
            >
              <motion.span
                animate={isFollowing ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  size={14}
                  className={isFollowing ? "fill-current" : ""}
                />
              </motion.span>
              {busy ? "..." : isFollowing ? "تتم المتابعة" : "متابعة"}
            </motion.button>

            <motion.button
              type="button"
              onClick={onMessage}
              whileTap={{ scale: 0.97 }}
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl border border-slate-200 bg-white py-3
                text-sm font-black text-slate-900 shadow-sm transition
                hover:bg-slate-50
                dark:border-slate-700 dark:bg-slate-900 dark:text-white
                dark:hover:bg-slate-800
              "
            >
              <MessageCircle size={14} />
              مراسلة
            </motion.button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/profile/edit"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-blue-600 py-3 text-sm font-black
                text-white shadow-lg shadow-blue-500/30 transition
                hover:bg-blue-700 active:scale-[0.97]
              "
            >
              <Pencil size={13} />
              تعديل المعرض
            </Link>
            <Link
              href="/my-listings"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl border border-slate-200 bg-white py-3
                text-sm font-black text-slate-900 transition
                hover:bg-slate-50 active:scale-[0.97]
                dark:border-slate-700 dark:bg-slate-900 dark:text-white
                dark:hover:bg-slate-800
              "
            >
              <Car size={13} />
              إعلاناتي
            </Link>
          </div>
        )}

        {/* Stats card */}
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <StatItem
            icon={Users}
            value={formatViewsK(followersN)}
            label="المتابعون"
          />
          <StatItem
            icon={Eye}
            value={formatViewsK(viewsCount)}
            label="المشاهدات"
          />
          <StatItem
            icon={Car}
            value={
              totalListings >= 10
                ? `${totalListings}+`
                : String(totalListings)
            }
            label="إجمالي السيارات"
          />
          <StatItem
            icon={Award}
            value={String(yearsInBratsho)}
            label="سنوات في براتشو"
          />
        </div>

        {/* Stories rings */}
        <StoriesRings
          rings={categoryRings}
          isOwner={isOwnProfile}
          onOpen={onStoryOpen}
          onAdd={onAddStory}
        />
      </div>
    </article>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FloatingButton({
  icon: Icon,
  onClick,
  ...rest
}: {
  icon: any;
  onClick?: () => void;
  [key: string]: any;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="
        inline-flex h-10 w-10 items-center justify-center
        rounded-full bg-white/95 text-slate-900
        shadow-lg backdrop-blur transition
        hover:bg-white
      "
      {...rest}
    >
      <Icon size={16} strokeWidth={2.2} />
    </motion.button>
  );
}

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
    <div className="flex flex-col items-center gap-1.5 px-1 text-center">
      <Icon size={18} className="text-blue-600 dark:text-blue-400" strokeWidth={2} />
      <span className="text-base font-black tabular-nums text-slate-950 dark:text-white">
        {value}
      </span>
      <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

function FollowersStack({ count }: { count: number }) {
  return (
    <div className="flex -space-x-1.5 rtl:space-x-reverse">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`
            h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-900
            bg-gradient-to-br
            ${i === 0 ? "from-blue-500 to-indigo-600" : ""}
            ${i === 1 ? "from-purple-500 to-pink-600" : ""}
            ${i === 2 ? "from-emerald-500 to-teal-600" : ""}
            ${i === 3 ? "from-amber-500 to-orange-600" : ""}
          `}
        />
      ))}
    </div>
  );
}

function StoriesRings({
  rings,
  isOwner,
  onOpen,
  onAdd,
}: {
  rings: Array<{
    key: StoryCategory;
    label: string;
    shortLabel: string;
    fallbackIcon: string;
    gradient: string;
    count: number;
    latestThumb: string | null;
  }>;
  isOwner: boolean;
  onOpen?: (cat: StoryCategory) => void;
  onAdd?: () => void;
}) {
  // إن لم تكن هناك stories وليس المالك: لا نُظهر القسم
  const hasAnyStories = rings.some((r) => r.count > 0);
  if (!hasAnyStories && !isOwner) return null;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          className="
            inline-flex items-center gap-0.5 text-[12px] font-black
            text-blue-600 dark:text-blue-400
          "
        >
          <ChevronLeft size={12} />
          عرض الكل
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          القصص
        </span>
      </div>

      {/* Rings scroll */}
      <div className="-mx-4 sm:-mx-5">
        <div
          className="
            flex gap-3 overflow-x-auto px-4 pb-2 sm:px-5
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            snap-x snap-mandatory
          "
        >
          {rings.map((ring) => {
            const hasContent = ring.count > 0;
            // إخفاء التصنيف الفارغ للزوار (نُبقيها للمالك لإمكانية الإضافة)
            if (!hasContent && !isOwner) return null;
            return (
              <StoryRing
                key={ring.key}
                ring={ring}
                onClick={() => hasContent && onOpen?.(ring.key)}
              />
            );
          })}

          {/* زر "إضافة قصة" للمالك */}
          {isOwner && (
            <button
              type="button"
              onClick={onAdd}
              className="flex shrink-0 snap-start flex-col items-center gap-1.5"
            >
              <div className="
                flex h-16 w-16 items-center justify-center
                rounded-full border-2 border-dashed border-slate-300
                bg-slate-50 text-blue-600 transition
                active:scale-95 hover:border-blue-500
                dark:border-slate-700 dark:bg-slate-900
              ">
                <Plus size={22} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                إضافة قصة
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryRing({
  ring,
  onClick,
}: {
  ring: {
    key: StoryCategory;
    label: string;
    shortLabel: string;
    fallbackIcon: string;
    gradient: string;
    count: number;
    latestThumb: string | null;
  };
  onClick: () => void;
}) {
  const hasContent = ring.count > 0;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      disabled={!hasContent}
      className="
        flex shrink-0 snap-start flex-col items-center gap-1.5
        disabled:opacity-50
      "
    >
      {/* Ring with gradient when has content */}
      <div
        className={`
          relative h-16 w-16 rounded-full p-[2.5px]
          ${hasContent
            ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
            : "bg-slate-200 dark:bg-slate-800"
          }
        `}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-white ring-2 ring-white dark:bg-slate-900 dark:ring-slate-900">
          {ring.latestThumb ? (
            <Image
              src={ring.latestThumb}
              alt={ring.label}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${ring.gradient} text-2xl`}>
              {ring.fallbackIcon}
            </div>
          )}
        </div>
        {ring.count > 1 && (
          <div className="absolute -bottom-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
            {ring.count}
          </div>
        )}
      </div>
      <span className="
        max-w-[68px] truncate text-[10px] font-black
        text-slate-700 dark:text-slate-300
      ">
        {ring.shortLabel}
      </span>
    </motion.button>
  );
}

function formatViewsK(n: number): string {
  if (!n || n < 0) return "0";
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K+`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
}
