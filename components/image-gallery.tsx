"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const FALLBACK = "/icons/car-card.svg";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images?.length ? images : [FALLBACK];
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);
  const next = () => setIdx((i) => (i + 1) % list.length);

  return (
    <>
      <div className="card overflow-hidden p-0">
        {/* Main image */}
        <div className="relative h-64 bg-slate-100 dark:bg-slate-800 sm:h-80 lg:h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[idx]}
            alt={`${alt}-${idx + 1}`}
            className="h-full w-full object-cover cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="السابق"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md text-slate-800"
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="التالي"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md text-slate-800"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {idx + 1} / {list.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {list.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
            {list.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                  i === idx
                    ? "border-brand-600"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
                aria-label={`صورة ${i + 1}`}
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
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="السابق"
              >
                <ChevronRight size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
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
