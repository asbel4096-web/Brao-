"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import {
  Bookmark,
  Eye,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Share2,
  Tag,
  UserPlus,
  UserCheck,
  Volume2,
  VolumeX,
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
  // نسبة الصورة/الفيديو (height / width). > 1 يعني طولية، < 1 عرضية.
  // null حتى يُحمَّل المحتوى. تُحدَّد عبر onLoad/onLoadedMetadata.
  const [mediaAspect, setMediaAspect] = useState<number | null>(null);

  // كتم الفيديو - افتراضي true لضمان عمل autoplay على كل المتصفحات.
  // يُحفظ في الـstate لأن المستخدم قد يُفعّل الصوت بنقرة، ويبقى مفعّلاً
  // لباقي الستوريز في الجلسة (نمط Instagram).
  const [muted, setMuted] = useState(true);

  // حالة تحميل الفيديو لعرض loading/error overlay.
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );

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
    // أعد ضبط النسبة كي تُكتشف من جديد للوسيط الحالي
    setMediaAspect(null);
    // أعد ضبط حالة الفيديو - الستوري الجديد قد يكون صورة أو فيديو.
    setVideoStatus(currentMedia?.kind === "video" ? "loading" : "idle");
  }, [index, currentMedia?.kind]);

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
      // محاولة play مع log الخطأ بدلاً من ابتلاع صامت.
      // أبرز سبب فشل: المتصفح يمنع autoplay مع صوت.
      // الـmuted=true في الـstate يحلّ ذلك.
      void videoRef.current.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[StoryViewer] فشل تشغيل الفيديو:", err);
        setVideoStatus("error");
      });
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

  const dragOpacity = Math.max(0.4, 1 - dragOffsetY / 400);

  /**
   * اختيار object-fit الذكي حسب نسبة الصورة:
   * - نسبة ≥ 1.6 (طولية قريبة من 9:16): cover — تملأ الشاشة طبيعياً.
   * - نسبة < 1.6 (3:4، مربعة، أفقية): contain — تظهر كاملة بدون قص،
   *   والخلفية المموّهة تملأ ما حولها.
   * - النسبة null (لم تُحمَّل بعد): contain — آمن افتراضياً.
   */
  const isPortraitFullscreen = mediaAspect !== null && mediaAspect >= 1.6;
  const fitClass = isPortraitFullscreen ? "object-cover" : "object-contain";

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
        ====== خلفية مموّهة من نفس الصورة ======
        تظهر فقط عندما تكون الصورة contain (نسبة ليست 9:16) لتملأ الفراغ
        بدل ظهور شريط أسود/رمادي قبيح أعلى وأسفل الصورة. مثل Instagram.
      */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-70 blur-2xl"
        style={{
          backgroundImage: `url(${currentMedia.thumbnailUrl || currentMedia.url})`,
        }}
        aria-hidden="true"
      />
      {/* طبقة تعتيم خفيفة على الخلفية المموّهة لزيادة وضوح النصوص */}
      <div
        className="absolute inset-0 bg-black/35"
        aria-hidden="true"
      />

      {/*
        ====== المحتوى ======
        - 9:16 (طولية): cover يملأ الشاشة.
        - 3:4، مربعة، أفقية: contain يُظهرها كاملة + خلفية blur حولها.
      */}
      <div
        className="absolute inset-0"
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: dragOffsetY === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        {currentMedia.kind === "video" ? (
          <>
            <video
              ref={videoRef}
              src={currentMedia.url}
              className={`h-full w-full ${fitClass}`}
              playsInline
              muted={muted}
              autoPlay
              preload="auto"
              onEnded={next}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) {
                  setMediaAspect(v.videoHeight / v.videoWidth);
                }
              }}
              onCanPlay={() => setVideoStatus("ready")}
              onWaiting={() => setVideoStatus("loading")}
              onPlaying={() => setVideoStatus("ready")}
              onError={(e) => {
                // eslint-disable-next-line no-console
                console.warn(
                  "[StoryViewer] خطأ تحميل الفيديو:",
                  e.currentTarget.error
                );
                setVideoStatus("error");
              }}
            />

            {/* Overlay: جارٍ التحميل / تعذّر التشغيل */}
            {videoStatus === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 size={32} className="animate-spin text-white" />
              </div>
            )}
            {videoStatus === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-6 text-center text-white">
                <X size={32} className="opacity-80" />
                <p className="text-sm font-black">تعذّر تشغيل الفيديو</p>
                <p className="text-xs text-white/70">
                  قد تكون شبكتك بطيئة، أو الصيغة غير مدعومة.
                </p>
              </div>
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentMedia.url}
            alt={currentStory.ownerName}
            className={`h-full w-full ${fitClass}`}
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setMediaAspect(img.naturalHeight / img.naturalWidth);
              }
            }}
          />
        )}
      </div>

      {/* تظليل علوي بهوية براتشو — بدرجة الأزرق الداكن قليلاً */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/70 via-ink/30 to-transparent"
      />

      {/* تظليل سفلي عميق ليبرز كارد المعلومات */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
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

            {/* زر الصوت - يظهر فقط للستوريز التي هي فيديو.
                النقر يبدّل muted state ويُفعّل الصوت على عنصر الفيديو فوراً. */}
            {currentMedia.kind === "video" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted((prev) => {
                    const next = !prev;
                    // طبّق على عنصر الفيديو مباشرة لتفادي تأخّر الـrerender.
                    if (videoRef.current) {
                      videoRef.current.muted = next;
                    }
                    return next;
                  });
                }}
                className="
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-full bg-white/15 backdrop-blur-md transition
                  active:scale-95 hover:bg-white/25
                "
                aria-label={muted ? "تفعيل الصوت" : "كتم الصوت"}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}

            <OwnerOnly ownerId={currentStory.ownerId}>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold backdrop-blur-md">
                <Eye size={12} />
                {formatStoryCount(Number(currentStory.viewsCount || 0))}
              </div>
            </OwnerOnly>

            <div className="flex-1" />

            {/* وقت النشر + رقم الصفحة */}
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-white/80 drop-shadow">
              <span>{timeAgo(currentStory.createdAtMs)}</span>
              <span className="text-white/40">•</span>
              <span>
                {currentPage.mediaIndex + 1}/{currentPage.totalMedia}
              </span>
            </div>

            {/* بطاقة المالك المصغّرة: صورة + اسم في pill أنيق صغير */}
            <Link
              href={`/traders/${currentStory.ownerId}`}
              onClick={onClose}
              aria-label={currentStory.ownerName}
              className="
                inline-flex max-w-[40%] shrink-0 items-center gap-1.5
                rounded-full border border-white/15 bg-white/12 py-0.5 pl-2 pr-0.5
                backdrop-blur-md transition active:scale-[0.97]
              "
            >
              <span className="truncate text-[11px] font-black text-white">
                {currentStory.ownerName}
              </span>
              {currentStory.ownerPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStory.ownerPhotoURL}
                  alt={currentStory.ownerName}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-action-500"
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-[9px] font-black text-white ring-1 ring-action-500">
                  {(currentStory.ownerName || "م").charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/*
        لا توجد علامة Bratsho UI floating — العلامة المائية في الصورة نفسها
        (مدموجة عند رفع الإعلان) تكفي تماماً. هذا يُبقي الستوري نظيفاً.
      */}

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
        pointer-events-none absolute z-30 flex flex-col items-center gap-5
        right-2 sm:right-3
      "
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 9.5rem)",
      }}
    >
      {/* متابعة - أيقونة بسيطة وأنيقة (الصورة + الاسم موجودان في الهيدر) */}
      {!isOwn && (
        <RailButton
          label={isFollowing ? "متابَع" : "متابعة"}
          onClick={handleFollow}
          tone={isFollowing ? "neutral" : "action"}
          active={isFollowing}
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

      {/* مشاركة - واضحة لكن غير مزعجة */}
      <RailButton label="مشاركة" onClick={handleShare}>
        <Share2 size={19} />
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
        relative overflow-hidden rounded-3xl border border-white/10
        bg-gradient-to-br from-ink/65 via-brand-900/55 to-ink/65
        px-3 py-2.5 shadow-2xl backdrop-blur-xl
      "
    >
      {/* لمسة برتقالية - شريط رفيع علوي بهوية براتشو */}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px rounded-b-full bg-gradient-to-r from-transparent via-action-500/80 to-transparent"
      />

      {/* السطر العلوي: شارة النوع + المدينة يميناً، السعر يساراً */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`
              inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5
              text-[10px] font-black text-white
              ${badge.bg}
            `}
          >
            {badge.icon}
            {badge.label}
          </span>
          {city ? (
            <span className="inline-flex min-w-0 items-center gap-0.5 text-[11px] font-bold text-white/85">
              <MapPin size={11} className="shrink-0 text-action-400" />
              <span className="truncate">{city}</span>
            </span>
          ) : null}
        </div>

        {price ? (
          <span
            className="
              inline-flex shrink-0 items-center rounded-full bg-gradient-to-r
              from-action-500 to-action-600 px-2.5 py-0.5 text-[12px] font-black
              text-white shadow-action
            "
          >
            {price}
          </span>
        ) : null}
      </div>

      {/* العنوان - سطر واحد فقط */}
      <h3 className="mt-1 line-clamp-1 text-[13px] font-black leading-snug text-white">
        {title}
      </h3>

      {/* أزرار التواصل - أقل ارتفاعاً ومرتّبة */}
      {(phone || wa || listingHref) && (
        <div className="mt-2 flex gap-1.5">
          {listingHref ? (
            <Link
              href={listingHref}
              className="
                inline-flex h-9 flex-1 items-center justify-center gap-1
                rounded-xl bg-white px-2 text-[11px] font-black text-brand-800
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
                inline-flex h-9 flex-1 items-center justify-center gap-1
                rounded-xl border border-white/15 bg-white/10 px-2 text-[11px]
                font-black text-white backdrop-blur transition
                active:scale-[0.97] hover:bg-white/20
              "
            >
              <Phone size={13} />
              اتصال
            </a>
          ) : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="
                inline-flex h-9 flex-1 items-center justify-center gap-1
                rounded-xl bg-emerald-500 px-2 text-[11px] font-black text-white
                shadow-md transition active:scale-[0.97] hover:bg-emerald-600
              "
            >
              <MessageCircle size={13} />
              واتساب
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
