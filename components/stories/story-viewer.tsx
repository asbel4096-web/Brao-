"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  Tag,
  Wrench,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerOnly } from "@/components/owner-only";
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

interface Props {
  stories: StoryDisplayItem[];
  startIndex?: number;
  onClose: () => void;
  onCompleteOwner?: () => void;
  onViewedStory?: (storyId: string) => void;
}

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const viewedStoryIdsRef = useRef<Set<string>>(new Set());

  const currentPage = pages[index];
  const currentStory = currentPage?.story;
  const currentMedia = currentPage?.media;
  const currentDurationMs =
    currentMedia?.kind === "video" && currentMedia.durationSec
      ? Math.max(3000, currentMedia.durationSec * 1000)
      : STORY_DEFAULT_IMAGE_DURATION_MS;

  useEffect(() => {
    if (!currentStory) return;
    onViewedStory?.(currentStory.id);

    if (!user || user.uid === currentStory.ownerId || viewedStoryIdsRef.current.has(currentStory.id)) {
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
        // تجاهل فشل التحليلات حتى لا تتعطل المشاهدة
      }
    };

    void recordView();
  }, [currentStory, onViewedStory, user]);

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
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current);
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

  if (!currentPage || !currentStory || !currentMedia) return null;

  const ownerPhoto = currentStory.ownerPhotoURL || currentStory.coverUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-black/90" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 blur-sm"
        style={{ backgroundImage: `url(${currentMedia.thumbnailUrl || currentStory.coverUrl})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col text-white">
        <div className="flex gap-1 p-3">
          {pages.map((page, pageIndex) => (
            <div key={page.pageId} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: pageIndex < index ? "100%" : pageIndex === index ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ownerPhoto}
            alt={currentStory.ownerName}
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{currentStory.ownerName}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/75">
              <span>{timeAgo(currentStory.createdAtMs)}</span>
              <span>•</span>
              <span>
                {currentPage.mediaIndex + 1}/{currentPage.totalMedia}
              </span>
            </div>
          </div>

          <OwnerOnly ownerId={currentStory.ownerId}>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
              <Eye size={12} />
              {formatStoryCount(Number(currentStory.viewsCount || 0))}
            </div>
          </OwnerOnly>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <button type="button" onClick={prev} className="absolute inset-y-0 right-0 z-20 w-1/3" aria-label="السابق" />
          <button type="button" onClick={next} className="absolute inset-y-0 left-0 z-20 w-1/3" aria-label="التالي" />

          <button
            type="button"
            onClick={prev}
            className="absolute right-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60 sm:inline-flex"
            aria-label="السابق"
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute left-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60 sm:inline-flex"
            aria-label="التالي"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex h-full items-center justify-center px-4 pb-6 pt-2">
            <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/10 bg-black shadow-2xl">
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

              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
              {/*
                شريط معلومات سفلي خفيف — يحتوي البيانات فقط ولا يغطي
                منتصف الصورة. يبقى مرتبطاً بأسفل الشاشة لمظهر احترافي.
              */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="pointer-events-none h-10 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="bg-black/35 px-3 pb-3 pt-2 backdrop-blur-sm">
                  <StoryCaption story={currentStory} currentPage={currentPage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryCaption({
  story,
  currentPage,
}: {
  story: StoryDisplayItem;
  currentPage: StoryPageItem;
}) {
  const typeBadge = {
    car: "سيارة",
    service: "خدمة",
    offer: "عرض",
  }[story.type];

  if (story.type === "car") {
    const payload = story.payload as CarStoryPayload;
    return (
      <div className="text-white">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="badge-action !bg-white/15 !text-white">{typeBadge}</span>
          <span className="text-[11px] text-white/70">{currentPage.mediaIndex + 1}/{currentPage.totalMedia}</span>
        </div>
        <h3 className="line-clamp-1 text-base font-black leading-tight">{payload.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/85">
          {typeof payload.price === "number" && payload.price > 0 ? (
            <span className="rounded-full bg-brand-700/95 px-2 py-0.5 text-sm font-black">
              {payload.price.toLocaleString("ar-LY")} د.ل
            </span>
          ) : null}
          {payload.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {payload.city}
            </span>
          ) : null}
        </div>
        <ContactButtons phone={payload.phone} whatsapp={payload.whatsapp}>
          {payload.listingId ? (
            <Link href={`/listings/${payload.listingId}`} className="btn-primary !min-h-[36px] !flex-1 !px-3 !py-2 !text-xs">
              فتح الإعلان
            </Link>
          ) : null}
        </ContactButtons>
      </div>
    );
  }

  if (story.type === "service") {
    const payload = story.payload as ServiceStoryPayload;
    return (
      <div className="text-white">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-black text-white">
            <Wrench size={12} />
            {typeBadge}
          </span>
          <span className="text-[11px] text-white/70">{currentPage.mediaIndex + 1}/{currentPage.totalMedia}</span>
        </div>
        <h3 className="line-clamp-1 text-base font-black leading-tight">{payload.serviceName}</h3>
        {payload.city ? (
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-white/80">
            <MapPin size={12} />
            {payload.city}
          </div>
        ) : null}
        <ContactButtons phone={payload.phone} whatsapp={payload.whatsapp} />
      </div>
    );
  }

  const payload = story.payload as OfferStoryPayload;
  return (
    <div className="text-white">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-action-500/90 px-2.5 py-0.5 text-xs font-black text-white">
          <Tag size={12} />
          {typeBadge}
        </span>
        <span className="text-[11px] text-white/70">{currentPage.mediaIndex + 1}/{currentPage.totalMedia}</span>
      </div>
      <h3 className="line-clamp-1 text-base font-black leading-tight">{payload.title}</h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/85">
        {payload.discount ? (
          <span className="rounded-full bg-action-500/95 px-2 py-0.5 text-sm font-black">
            {payload.discount}
          </span>
        ) : null}
        {payload.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {payload.city}
          </span>
        ) : null}
      </div>
      <ContactButtons phone={payload.phone} whatsapp={payload.whatsapp} />
    </div>
  );
}

function ContactButtons({
  phone,
  whatsapp,
  children,
}: {
  phone?: string;
  whatsapp?: string;
  children?: React.ReactNode;
}) {
  const wa = normalizeLibyanPhone(whatsapp || phone || "");

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {children}
      {phone ? (
        <a href={`tel:${phone}`} className="btn-secondary !min-h-[36px] !flex-1 !border-white/15 !bg-white/10 !px-3 !py-2 !text-xs !text-white hover:!bg-white/20">
          <Phone size={14} />
          اتصال
        </a>
      ) : null}
      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary !min-h-[36px] !flex-1 !border-white/15 !bg-emerald-500/80 !px-3 !py-2 !text-xs !text-white hover:!bg-emerald-500"
        >
          <MessageCircle size={14} />
          واتساب
        </a>
      ) : null}
    </div>
  );
}
