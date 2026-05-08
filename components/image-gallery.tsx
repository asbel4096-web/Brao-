"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

const FALLBACK = "/icons/car-card.svg";

/**
 * معرض صور احترافي بمواصفات حديثة:
 *
 * - **swipe على الموبايل** عبر touch gestures (threshold 50px).
 * - **scroll-snap** أصلي للتمرير السلس بين الصور.
 * - dot indicators في الأسفل + counter (1/N) في الأعلى.
 * - thumbnails عند الديسكتوب فقط (مخفية على الموبايل لتوفير المساحة).
 * - lightbox عند الضغط على أيقونة maximize.
 * - أزرار chevron تظهر على hover للديسكتوب فقط.
 * - keyboard support (سهم يمين/يسار/Escape).
 */

interface Props {
  images: string[];
  alt: string;
}

export function ImageGallery({ images, alt }: Props) {
  const list = images?.length ? images : [FALLBACK];
  const isFallback = !images?.length;

  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  // مزامنة الـ scroll-snap عند تغيير الـ index برمجياً
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[idx] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }, [idx]);

  // الكشف عن الـ slide الحالي من scroll-snap (لتحديث dots عند swipe يدوي)
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const w = track.clientWidth;
    const newIdx = Math.round(track.scrollLeft / w);
    if (newIdx !== idx && newIdx >= 0 && newIdx < list.length) {
      setIdx(newIdx);
    }
  };

  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);
  const next = () => setIdx((i) => (i + 1) % list.length);

  // دعم touch swipe (احتياطي - scroll-snap الأصلي يفعل المهمة لكن نحتفظ به للموبايل القديم)
  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    // RTL: السحب يميناً = next، السحب يساراً = prev
    if (Math.abs(delta) < 50) return;
    if (delta > 0) prev();
    else next();
  };

  // Keyboard navigation داخل الـ lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") prev();
      if (e.key === "ArrowLeft") next();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  return (
    <>
      <div className="space-y-3">
        {/* الصورة الرئيسية مع scroll-snap للسحب الأصلي */}
        <div
          className="
            group relative w-full overflow-hidden
            rounded-3xl border border-slate-200/70 bg-slate-100
            shadow-card aspect-[4/3]
            dark:border-slate-700/70 dark:bg-slate-800
          "
        >
          {/* track يحتوي كل الصور، يقبل swipe + scroll-snap */}
          <div
            ref={trackRef}
            onScroll={handleScroll}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="
              flex h-full w-full snap-x snap-mandatory overflow-x-auto
              overflow-y-hidden no-scrollbar
              [scroll-behavior:smooth]
            "
            role="region"
            aria-label={alt}
          >
            {list.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative h-full w-full shrink-0 snap-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${alt} - صورة ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={`
                    h-full w-full select-none
                    ${
                      isFallback
                        ? "object-contain p-12 opacity-60"
                        : "object-cover"
                    }
                  `}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* تظليل تدريجي خفيف لإبراز عناصر التحكم */}
          {!isFallback && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent"
              />
            </>
          )}

          {/* counter في الأعلى */}
          {list.length > 1 && (
            <div
              className="
                absolute right-3 top-3 inline-flex items-center
                rounded-full border border-white/20 bg-black/50 px-2.5 py-1
                text-[11px] font-black text-white backdrop-blur-md
              "
            >
              {idx + 1} / {list.length}
            </div>
          )}

          {/* maximize للـ lightbox */}
          {!isFallback && (
            <button
              type="button"
              onClick={() => setLightbox(true)}
              aria-label="تكبير"
              className="
                absolute left-3 top-3 inline-flex h-9 w-9
                items-center justify-center rounded-full border
                border-white/20 bg-black/50 text-white backdrop-blur-md
                transition hover:bg-black/70 active:scale-95
              "
            >
              <Maximize2 size={16} />
            </button>
          )}

          {/* chevrons للديسكتوب — تظهر على hover فقط */}
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="السابق"
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  hidden h-11 w-11 items-center justify-center
                  rounded-full border border-white/20 bg-black/50
                  text-white opacity-0 backdrop-blur-md
                  transition-all hover:bg-black/70
                  group-hover:opacity-100 sm:inline-flex
                "
              >
                <ChevronRight size={22} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="التالي"
                className="
                  absolute left-3 top-1/2 -translate-y-1/2
                  hidden h-11 w-11 items-center justify-center
                  rounded-full border border-white/20 bg-black/50
                  text-white opacity-0 backdrop-blur-md
                  transition-all hover:bg-black/70
                  group-hover:opacity-100 sm:inline-flex
                "
              >
                <ChevronLeft size={22} />
              </button>
            </>
          )}

          {/* dot indicators */}
          {list.length > 1 && (
            <div
              className="
                absolute inset-x-0 bottom-3 flex justify-center gap-1.5
              "
              aria-hidden="true"
            >
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`
                    h-1.5 rounded-full transition-all duration-300
                    ${
                      i === idx
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/80"
                    }
                  `}
                  aria-label={`الصورة ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* thumbnails - مخفية على الموبايل، تظهر على sm+ */}
        {list.length > 1 && (
          <div
            className="
              -mx-1 hidden gap-2 overflow-x-auto px-1 pb-1
              no-scrollbar sm:flex
            "
          >
            {list.map((src, i) => (
              <button
                key={`${src}-thumb-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`صورة ${i + 1}`}
                aria-current={i === idx}
                className={`
                  relative h-20 w-20 shrink-0 overflow-hidden
                  rounded-2xl border-2 transition-all duration-200
                  ${
                    i === idx
                      ? "border-brand-600 ring-2 ring-brand-600/30 scale-105"
                      : "border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-700"
                  }
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`thumb-${i}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="
              absolute top-4 left-4 inline-flex h-11 w-11
              items-center justify-center rounded-full bg-white/10
              text-white transition hover:bg-white/20
            "
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>

          <div className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
            {idx + 1} / {list.length}
          </div>

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="السابق"
                className="
                  absolute right-4 top-1/2 -translate-y-1/2 inline-flex
                  h-12 w-12 items-center justify-center rounded-full
                  bg-white/10 text-white transition hover:bg-white/20
                "
              >
                <ChevronRight size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="التالي"
                className="
                  absolute left-4 top-1/2 -translate-y-1/2 inline-flex
                  h-12 w-12 items-center justify-center rounded-full
                  bg-white/10 text-white transition hover:bg-white/20
                "
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
