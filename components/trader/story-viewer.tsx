"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { DealerStory, StoryCategory } from "@/lib/dealer/stories";
import { findCategory } from "@/lib/dealer/stories";

/**
 * Dealer Stories Viewer - fullscreen مثل Instagram/Snapchat.
 *
 * - شريط تقدّم في الأعلى يدلّ على القصة الحالية + الباقيات
 * - tap على الجوانب: previous/next
 * - tap في الوسط: pause/play
 * - swipe down: إغلاق
 * - auto-advance بعد 6 ثوانٍ
 */

interface Props {
  open: boolean;
  onClose: () => void;
  stories: DealerStory[];
  category: StoryCategory;
  dealerName?: string;
  dealerLogo?: string;
  startIndex?: number;
}

const STORY_DURATION_MS = 6000;

export function StoryViewer({
  open,
  onClose,
  stories,
  category,
  dealerName,
  dealerLogo,
  startIndex = 0,
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const catMeta = findCategory(category);
  const currentStory = stories[currentIdx];

  // Reset when opening/changing
  useEffect(() => {
    if (open) {
      setCurrentIdx(startIndex);
      setProgress(0);
      setPaused(false);
    }
  }, [open, startIndex]);

  // Progress + auto-advance
  useEffect(() => {
    if (!open || paused || !currentStory) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          // التالي أو إغلاق
          if (currentIdx < stories.length - 1) {
            setCurrentIdx(currentIdx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + (100 / (STORY_DURATION_MS / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [open, paused, currentIdx, currentStory, stories.length, onClose]);

  const handleNext = useCallback(() => {
    if (currentIdx < stories.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIdx, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setProgress(0);
    }
  }, [currentIdx]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handleNext(); // RTL = arrow left → next
      if (e.key === "ArrowRight") handlePrev();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleNext, handlePrev, onClose]);

  if (!stories.length) return null;

  return (
    <AnimatePresence>
      {open && currentStory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black"
          dir="rtl"
        >
          {/* Image/Video */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentStory.mediaType === "video" ? (
              <video
                src={currentStory.mediaURL}
                autoPlay
                playsInline
                muted={false}
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={currentStory.mediaURL}
                alt={currentStory.caption || ""}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            )}
          </div>

          {/* Tap zones */}
          <div className="absolute inset-0 z-10 grid grid-cols-3">
            <button
              type="button"
              onClick={handleNext}
              aria-label="السابق"
              className="cursor-default"
            />
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label="إيقاف/تشغيل"
              className="cursor-default"
            />
            <button
              type="button"
              onClick={handlePrev}
              aria-label="التالي"
              className="cursor-default"
            />
          </div>

          {/* Top overlay: progress bars + header */}
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent p-3">
            {/* Progress bars */}
            <div className="flex gap-1">
              {stories.map((_, i) => (
                <div
                  key={i}
                  className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
                >
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < currentIdx
                          ? "100%"
                          : i === currentIdx
                          ? `${progress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="mt-3 flex items-center gap-2">
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white">
                {dealerLogo ? (
                  <Image
                    src={dealerLogo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-black text-white">
                    {dealerName?.charAt(0).toUpperCase() || "M"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">
                  {dealerName}
                </p>
                <p className="text-[11px] text-white/80">
                  {catMeta?.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
                aria-label="إيقاف/تشغيل"
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Bottom caption */}
          {currentStory.caption && (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 pb-6">
              <p className="text-[14px] leading-6 text-white">
                {currentStory.caption}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
