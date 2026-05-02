"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ImageOff } from "lucide-react";

const FALLBACK = "/icons/car-card.svg";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images?.length ? images : [FALLBACK];
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);
  const next = () => setIdx((i) => (i + 1) % list.length);

  const isFallback = !images?.length;

  return (
    <>
      <div className="space-y-3">
        {/* Main image with fixed aspect ratio */}
        <div
          className="
            relative w-full overflow-hidden
            rounded-3xl border border-slate-200/80
            bg-slate-100
            shadow-card
            aspect-[4/3]
            dark:border-slate-700/80 dark:bg-slate-800
          "
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[idx]}
            alt={`${alt}-${idx + 1}`}
            className={`h-full w-full ${
              isFallback ? "object-contain p-12 opacity-60" : "object-cover cursor-zoom-in"
            }`}
            onClick={() => !isFallback && setLightbox(true)}
          />

          {/* تظليل تدريجي للأركان لإبراز الأزرار */}
          {!isFallback && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"
              />
            </>
          )}

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="السابق"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="التالي"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                {idx + 1} / {list.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails - منفصلة عن الصورة الرئيسية لمظهر أنظف */}
        {list.length > 1 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {list.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                  i === idx
                    ? "border-brand-600 ring-2 ring-brand-600/30"
                    : "border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-700"
                }`}
                aria-label={`صورة ${i + 1}`}
                aria-current={i === idx}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`thumb-${i}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="السابق"
              >
                <ChevronRight size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="التالي"
              >
                <ChevronLeft size={26} />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[idx]}
            alt={`${alt}-full-${idx + 1}`}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
