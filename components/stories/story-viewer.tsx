"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import {
  Bookmark,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Share2,
  Tag,
  UserPlus,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { OwnerOnly } from "@/components/owner-only";
import {
  useFollowTraderState,
  useListingLikeState,
} from "@/hooks/useListingEngagement";
import { useFavoriteState } from "@/hooks/useFavorites";
import type {
  CarStoryPayload,
  OfferStoryPayload,
  ServiceStoryPayload,
  StoryDisplayItem,
  StoryPageItem,
} from "@/lib/stories/types";
import {
  buildStoryPages,
  formatStoryCount,
  STORY_DEFAULT_IMAGE_DURATION_MS,
  timeAgo,
} from "@/lib/stories/helpers";
import { normalizeLibyanPhone } from "@/lib/utils";
import type { Listing } from "@/lib/types";

interface Props {
  stories: StoryDisplayItem[];
  startIndex?: number;
  onClose: () => void;
  onCompleteOwner?: () => void;
  onViewedStory?: (storyId: string) => void;
}

const SWIPE_DOWN_THRESHOLD = 80;

export function StoryViewer({
  stories,
  startIndex = 0,
  onClose,
  onCompleteOwner,
  onViewedStory,
}: Props) {
  const { user } = useAuth();
  const pages = useMemo(() => buildStoryPages(stories), [stories]);
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const viewedStoryIdsRef = useRef<Set<string>>(new Set());
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const currentPage = pages[index];
  const currentStory = currentPage?.story;
  const currentMedia = currentPage?.media;
  const currentDurationMs =
    currentMedia?.kind === "video" && currentMedia.durationSec
      ? Math.max(3000, currentMedia.durationSec * 1000)
      : STORY_DEFAULT_IMAGE_DURATION_MS;

  // تسجيل المشاهدة
  useEffect(() => {
    if (!currentStory) return;
    onViewedStory?.(currentStory.id);

    if (
      !user ||
      user.uid === currentStory.ownerId ||
      viewedStoryIdsRef.current.has(currentStory.id)
    ) {
      viewedStoryIdsRef.current.add(currentStory.id);
      return;
    }

    viewedStoryIdsRef.current.add(currentStory.id);

    const recordView = async () => {
      try {
        const storyRef = doc(db, "stories", currentStory.id);
        const viewerRef = doc(db, "stories", currentStory.id, "viewers", user.uid);

        await runTransaction(db, async (transaction) => {
          const viewerSnap = await transaction.get(viewerRef);
          if (viewerSnap.exists()) return;

          const storySnap = await transaction.get(storyRef);
          if (!storySnap.exists()) return;

          const currentViews = Number(storySnap.data().viewsCount || 0);

          transaction.set(viewerRef, {
            userId: user.uid,
            storyId: currentStory.id,
            ownerId: currentStory.ownerId,
            viewedAt: serverTimestamp(),
          });

          transaction.update(storyRef, {
            viewsCount: currentViews + 1,
          });
        });
      } catch {
        // تجاهل
      }
    };

    void recordView();
  }, [currentStory, onViewedStory, user]);

  // تقدّم
  useEffect(() => {
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = Date.now();
  }, [index]);

  useEffect(() => {
    if (paused) {
      elapsedBeforePauseRef.current += Date.now() - startedAtRef.current;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      return;
    }

    startedAtRef.current = Date.now();

    if (currentMedia?.kind === "video" && videoRef.current) {
      void videoRef.current.play().catch(() => undefined);
    }

    intervalRef.current = setInterval(() => {
      const elapsed =
        elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current);
      const pct = Math.min(100, (elapsed / currentDurationMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        next();
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, index, currentDurationMs, currentMedia?.kind]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") prev();
      if (event.key === "ArrowLeft") next();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const next = () => {
    if (index < pages.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    onCompleteOwner?.();
    onClose();
  };

  const prev = () => {
    if (index > 0) {
      setIndex((current) => current - 1);
    }
  };

  // معالجات اللمس
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    setPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      setDragOffsetY(0);
      return;
    }
    if (dy > 0) setDragOffsetY(dy);
  };

  const handleTouchEnd = () => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setPaused(false);
    if (!start) return;
    if (dragOffsetY > SWIPE_DOWN_THRESHOLD) {
      setDragOffsetY(0);
      onClose();
      return;
    }
    setDragOffsetY(0);
  };

  if (!currentPage || !currentStory || !currentMedia) return null;

  const ownerPhoto = currentStory.ownerPhotoURL || currentStory.coverUrl;
  const dragOpacity = Math.max(0.4, 1 - dragOffsetY / 400);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[140] overflow-hidden"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ backgroundColor: `rgba(2,6,23,${dragOpacity})` }}
    >
      {/*
        ====== الصورة fullscreen ======
        لا إطار، لا حواف ناعمة، الصورة تملأ الشاشة بالكامل بهوية فخمة.
      */}
      <div
        className="absolute inset-0"
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: dragOffsetY === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        {currentMedia.kind === "video" ? (
          <video
            ref={videoRef}
            src={currentMedia.url}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            onEnded={next}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentMedia.url}
            alt={currentStory.ownerName}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* تظليل علوي بهوية براتشو — بدرجة الأزرق الداكن قليلاً */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent"
      />

      {/* تظليل سفلي عميق ليبرز كارد المعلومات */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
      />

      {/* مناطق النقر للتنقّل */}
      <button
        type="button"
        onClick={prev}
        className="absolute inset-y-0 right-0 z-10 w-1/3"
        aria-label="السابق"
      />
      <button
        type="button"
        onClick={next}
        className="absolute inset-y-0 left-0 z-10 w-1/3"
        aria-label="التالي"
      />

      {/*
        ====== الهيدر العلوي ======
        أشرطة التقدّم + زر X + بطاقة المالك + شارة المشاهدات للمالك
      */}
      <div
        className="absolute inset-x-0 top-0 z-30 px-3"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto w-full max-w-md">
          {/* أشرطة التقدّم */}
          <div className="flex gap-1">
            {pages.map((page, pageIndex) => (
              <div
                key={page.pageId}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className="h-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                  style={{
                    width:
                      pageIndex < index
                        ? "100%"
                        : pageIndex === index
                        ? `${progress}%`
                        : "0%",
                    transition: pageIndex === index ? "none" : "width 200ms",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="
                inline-flex h-9 w-9 shrink-0 items-center justify-center
                rounded-full bg-white/15 backdrop-blur-md transition
                active:scale-95 hover:bg-white/25
              "
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <OwnerOnly ownerId={currentStory.ownerId}>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur-md">
                <Eye size={12} />
                {formatStoryCount(Number(currentStory.viewsCount || 0))}
              </div>
            </OwnerOnly>

            <div className="flex-1" />

            {/* بطاقة المالك المصغّرة */}
            <Link
              href={`/traders/${currentStory.ownerId}`}
              onClick={onClose}
              className="
                flex min-w-0 max-w-[65%] items-center gap-2
                rounded-full border border-white/10 bg-white/10 py-1 pl-1 pr-3
                backdrop-blur-md transition active:scale-[0.97]
              "
            >
              {ownerPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ownerPhoto}
                  alt={currentStory.ownerName}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-action-500"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-[10px] font-black ring-2 ring-action-500">
                  {(currentStory.ownerName || "م").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 text-right">
                <p className="truncate text-[12px] font-black leading-tight text-white">
                  {currentStory.ownerName}
                </p>
                <p className="truncate text-[10px] leading-tight text-white/70">
                  {timeAgo(currentStory.createdAtMs)} • {currentPage.mediaIndex + 1}/
                  {currentPage.totalMedia}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/*
        ====== علامة Bratsho ======
        أنيقة، صغيرة، أعلى يسار بعد الهيدر — تأخذ شكل badge مميّز
      */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute z-20 inline-flex select-none items-center
          gap-1 rounded-full border border-action-500/40 bg-black/40
          px-2 py-0.5 backdrop-blur-md
        "
        style={{
          left: "0.75rem",
          top: "calc(env(safe-area-inset-top) + 4.5rem)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-action-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
        <span className="text-[9px] font-black tracking-[0.15em] text-white/90">
          BRATSHO CAR
        </span>
      </div>

      {/* ====== الشريط الجانبي للتفاعل ====== */}
      <StoryActionsRail story={currentStory} onClose={onClose} />

      {/* ====== بطاقة المعلومات السفلية ====== */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-md">
          <StoryInfoCard story={currentStory} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   الشريط الجانبي للتفاعل — عصري، أنيق، بهوية براتشو
   ============================================================ */

function StoryActionsRail({
  story,
  onClose,
}: {
  story: StoryDisplayItem;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const isOwn = !!user && user.uid === story.ownerId;

  const { isFollowing, toggleFollow } = useFollowTraderState(story.ownerId);

  const linkedListingId =
    story.type === "car"
      ? (story.payload as CarStoryPayload).listingId
      : undefined;

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/stories/${story.id}`
        : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: story.ownerName, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ الرابط");
      }
    } catch {
      /* المستخدم ألغى */
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    try {
      await toggleFollow();
      toast.success(isFollowing ? "تم إلغاء المتابعة" : "تمت المتابعة");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ العملية");
    }
  };

  return (
    <div
      className="
        pointer-events-none absolute z-30 flex flex-col items-center gap-4
        right-2 sm:right-3
      "
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 13rem)",
      }}
    >
      {!isOwn && user && (
        <RailButton
          label={isFollowing ? "متابَع" : "متابعة"}
          onClick={handleFollow}
          tone={isFollowing ? "neutral" : "action"}
        >
          {isFollowing ? <UserCheck size={20} /> : <UserPlus size={20} />}
        </RailButton>
      )}

      {linkedListingId && (
        <>
          <RailLikeButton listingId={linkedListingId} story={story} />
          <RailLink
            href={`/listings/${linkedListingId}#comments`}
            label="تعليق"
            onClose={onClose}
          >
            <MessageSquare size={20} />
          </RailLink>
          <RailFavoriteButton listingId={linkedListingId} story={story} />
        </>
      )}

      <RailButton label="مشاركة" onClick={handleShare}>
        <Share2 size={20} />
      </RailButton>
    </div>
  );
}

function RailButton({
  children,
  label,
  onClick,
  tone = "neutral",
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "action" | "like";
  active?: boolean;
}) {
  const toneClass =
    tone === "action"
      ? "bg-action-500 text-white ring-2 ring-action-500/30 hover:bg-action-600"
      : tone === "like" && active
      ? "bg-rose-500 text-white ring-2 ring-rose-500/30"
      : "bg-white/15 text-white backdrop-blur-md hover:bg-white/25";

  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex flex-col items-center gap-1"
      aria-label={label}
    >
      <span
        className={`
          inline-flex h-11 w-11 items-center justify-center rounded-full
          shadow-lg transition active:scale-90
          ${toneClass}
        `}
      >
        {children}
      </span>
      <span className="text-[10px] font-black text-white drop-shadow-md">
        {label}
      </span>
    </button>
  );
}

function RailLink({
  href,
  label,
  onClose,
  children,
}: {
  href: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      prefetch={false}
      className="pointer-events-auto flex flex-col items-center gap-1"
      aria-label={label}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur-md transition active:scale-90 hover:bg-white/25">
        {children}
      </span>
      <span className="text-[10px] font-black text-white drop-shadow-md">
        {label}
      </span>
    </Link>
  );
}

function RailLikeButton({
  listingId,
  story,
}: {
  listingId: string;
  story: StoryDisplayItem;
}) {
  const { isLiked, toggle } = useListingLikeState(listingId);
  const toast = useToast();
  const payload = story.payload as CarStoryPayload;

  const handleClick = async () => {
    try {
      await toggle({
        id: listingId,
        title: payload.title || story.ownerName,
        price: payload.price ?? 0,
        ownerId: story.ownerId,
      } as Listing);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر التنفيذ");
    }
  };

  return (
    <RailButton
      label={isLiked ? "أعجبني" : "إعجاب"}
      onClick={handleClick}
      tone="like"
      active={isLiked}
    >
      <Heart size={20} className={isLiked ? "fill-current" : ""} />
    </RailButton>
  );
}

function RailFavoriteButton({
  listingId,
  story,
}: {
  listingId: string;
  story: StoryDisplayItem;
}) {
  const { isFav, toggle } = useFavoriteState(listingId);
  const toast = useToast();
  const payload = story.payload as CarStoryPayload;

  const handleClick = async () => {
    try {
      await toggle({
        id: listingId,
        title: payload.title || story.ownerName,
        price: payload.price ?? 0,
        ownerId: story.ownerId,
      } as Listing);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر التنفيذ");
    }
  };

  return (
    <RailButton
      label={isFav ? "محفوظ" : "حفظ"}
      onClick={handleClick}
      tone="neutral"
      active={isFav}
    >
      <Bookmark size={20} className={isFav ? "fill-current" : ""} />
    </RailButton>
  );
}

/* ============================================================
   بطاقة المعلومات السفلية الاحترافية (Glassmorphism بهوية براتشو)
   ============================================================ */

function StoryInfoCard({ story }: { story: StoryDisplayItem }) {
  const typeBadge = {
    car: { label: "سيارة", icon: <Tag size={11} />, bg: "bg-brand-700" },
    service: {
      label: "خدمة",
      icon: <Wrench size={11} />,
      bg: "bg-emerald-600",
    },
    offer: { label: "عرض", icon: <Tag size={11} />, bg: "bg-action-500" },
  }[story.type];

  if (story.type === "car") {
    const payload = story.payload as CarStoryPayload;
    return (
      <InfoCardShell
        badge={typeBadge}
        title={payload.title}
        price={
          typeof payload.price === "number" && payload.price > 0
            ? `${payload.price.toLocaleString("ar-LY")} د.ل`
            : undefined
        }
        city={payload.city}
        phone={payload.phone}
        whatsapp={payload.whatsapp}
        listingHref={
          payload.listingId ? `/listings/${payload.listingId}` : undefined
        }
      />
    );
  }

  if (story.type === "service") {
    const payload = story.payload as ServiceStoryPayload;
    return (
      <InfoCardShell
        badge={typeBadge}
        title={payload.serviceName}
        city={payload.city}
        phone={payload.phone}
        whatsapp={payload.whatsapp}
      />
    );
  }

  const payload = story.payload as OfferStoryPayload;
  return (
    <InfoCardShell
      badge={typeBadge}
      title={payload.title}
      price={payload.discount}
      city={payload.city}
      phone={payload.phone}
      whatsapp={payload.whatsapp}
    />
  );
}

function InfoCardShell({
  badge,
  title,
  price,
  city,
  phone,
  whatsapp,
  listingHref,
}: {
  badge: { label: string; icon: React.ReactNode; bg: string };
  title: string;
  price?: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  listingHref?: string;
}) {
  const wa = normalizeLibyanPhone(whatsapp || phone || "");

  return (
    <div
      className="
        relative overflow-hidden rounded-3xl border border-white/15
        bg-gradient-to-br from-ink/85 via-brand-900/75 to-ink/85
        p-3.5 shadow-2xl backdrop-blur-2xl
      "
    >
      {/* لمسة برتقالية - شريط رفيع علوي بهوية براتشو */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-gradient-to-r from-transparent via-action-500 to-transparent"
      />

      {/* السطر الأول: شارة النوع + السعر */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`
            inline-flex items-center gap-1 rounded-full px-2.5 py-1
            text-[11px] font-black text-white shadow-md
            ${badge.bg}
          `}
        >
          {badge.icon}
          {badge.label}
        </span>
        {price ? (
          <span
            className="
              inline-flex items-center rounded-full bg-gradient-to-r
              from-action-500 to-action-600 px-3 py-1 text-sm font-black
              text-white shadow-action
            "
          >
            {price}
          </span>
        ) : null}
      </div>

      {/* العنوان + المدينة */}
      <div className="mt-2.5">
        <h3 className="line-clamp-2 text-base font-black leading-snug text-white sm:text-lg">
          {title}
        </h3>
        {city ? (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-white/85">
            <MapPin size={12} className="text-action-400" />
            {city}
          </div>
        ) : null}
      </div>

      {/* أزرار التواصل */}
      {(phone || wa || listingHref) && (
        <div className="mt-3 flex gap-2">
          {listingHref ? (
            <Link
              href={listingHref}
              className="
                inline-flex h-11 flex-1 items-center justify-center gap-1.5
                rounded-2xl bg-white px-3 text-xs font-black text-brand-800
                shadow-md transition active:scale-[0.97]
              "
            >
              فتح الإعلان
            </Link>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="
                inline-flex h-11 flex-1 items-center justify-center gap-1.5
                rounded-2xl border border-white/20 bg-white/15 px-3 text-xs
                font-black text-white backdrop-blur transition
                active:scale-[0.97] hover:bg-white/25
              "
            >
              <Phone size={14} />
              اتصال
            </a>
          ) : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="
                inline-flex h-11 flex-1 items-center justify-center gap-1.5
                rounded-2xl bg-emerald-500 px-3 text-xs font-black text-white
                shadow-md transition active:scale-[0.97] hover:bg-emerald-600
              "
            >
              <MessageCircle size={14} />
              واتساب
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
