"use client";

import { useEffect, useRef, useState } from "react";
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
  // Guard so programmatic scrolling does not fight the scroll listener.
  const isProgrammaticScroll = useRef(false);

  // مزامنة الـ scroll-snap عند تغيير الـ index برمجياً.
  // نستخدم scrollIntoView بدل حساب offsetLeft يدوياً — يعمل بشكل صحيح
  // مع RTL حيث تكون قيم scrollLeft سالبة/معكوسة حسب المتصفح.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[idx] as HTMLElement | undefined;
    if (!slide) return;
    isProgrammaticScroll.current = true;
    slide.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    // أعد تفعيل مستمع التمرير بعد انتهاء الحركة.
    const t = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [idx]);

  // الكشف عن الـ slide الحالي من scroll-snap (لتحديث dots عند swipe يدوي).
  // RTL-safe: نحسب الفهرس من موضع مركز كل شريحة بالنسبة لمركز المسار،
  // بدلاً من القسمة على scrollLeft التي تنكسر في RTL.
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || isProgrammaticScroll.current) return;
    const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const child = track.children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const dist = Math.abs(childCenter - trackCenter);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    if (nearest !== idx && nearest >= 0 && nearest < list.length) {
      setIdx(nearest);
    }
  };

  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);
  const next = () => setIdx((i) => (i + 1) % list.length);

  // التمرير الأصلي (scroll-snap) يتكفّل بالـ swipe على الموبايل.
  // نزيل معالجات اللمس اليدوية لأنها كانت تنفّذ prev/next *إضافةً* إلى
  // الـ scroll-snap فيقفز العداد صورتين دفعة واحدة.
  // نكتفي بكشف الشريحة الحالية بعد استقرار التمرير (debounced).
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTrackScroll = () => {
    if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
    scrollSettleTimer.current = setTimeout(handleScroll, 90);
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
            onScroll={onTrackScroll}
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

          {/* علامة Bratsho Car احترافية - شفافة وأنيقة */}
          {!isFallback && (
            <div
              aria-hidden="true"
              className="
                pointer-events-none absolute bottom-3 left-3 select-none
                inline-flex items-center gap-1.5
                rounded-full border border-white/15 bg-black/40 px-2.5 py-1
                backdrop-blur-md
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-action-500" />
              <span className="text-[10px] font-black tracking-wider text-white/95">
                BRATSHO CAR
              </span>
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
