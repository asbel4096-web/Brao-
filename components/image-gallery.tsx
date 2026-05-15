"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react";

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
  // كشف الضغط القصير لفتح الـlightbox دون التعارض مع السحب الأفقي.
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);

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

  // Keyboard: Escape فقط لإغلاق العارض العمودي
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
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
                onPointerDown={(e) => {
                  pointerStart.current = {
                    x: e.clientX,
                    y: e.clientY,
                    t: Date.now(),
                  };
                }}
                onPointerUp={(e) => {
                  const start = pointerStart.current;
                  pointerStart.current = null;
                  if (!start || isFallback) return;
                  const dx = Math.abs(e.clientX - start.x);
                  const dy = Math.abs(e.clientY - start.y);
                  const dt = Date.now() - start.t;
                  // ضغطة قصيرة بدون سحب → افتح lightbox.
                  if (dx < 8 && dy < 8 && dt < 300) {
                    setLightbox(true);
                  }
                }}
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
                        : "object-cover cursor-zoom-in"
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
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label="تكبير"
                className="
                  inline-flex h-9 w-9
                  items-center justify-center rounded-full border
                  border-white/20 bg-black/50 text-white backdrop-blur-md
                  transition hover:bg-black/70 active:scale-95
                "
              >
                <Maximize2 size={16} />
              </button>

              {/*
                زر حفظ الصورة على الهاتف.
                - أندرويد/ديسكتوب: ينزّل مباشرة عبر <a download>.
                - iOS Safari: يفتح الصورة في تبويب جديد فيستطيع المستخدم
                  ضغطها مطوّلاً واختيار "حفظ في الصور".
              */}
              <a
                href={list[idx]}
                download
                target="_blank"
                rel="noreferrer"
                aria-label="حفظ الصورة"
                className="
                  inline-flex h-9 w-9
                  items-center justify-center rounded-full border
                  border-white/20 bg-black/50 text-white backdrop-blur-md
                  transition hover:bg-black/70 active:scale-95
                "
              >
                <Download size={16} />
              </a>
            </div>
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

      {/* Lightbox - تصفّح عمودي احترافي (كل الصور أسفل بعض) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[110] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
        >
          {/* شريط علوي ثابت */}
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 bg-black/90 px-3 backdrop-blur sm:h-16 sm:px-4">
            <a
              href={list[idx]}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="حفظ الصورة"
              className="
                inline-flex h-10 w-10 items-center justify-center
                rounded-full bg-white/10 text-white transition hover:bg-white/20
              "
            >
              <Download size={18} />
            </a>

            <div className="text-sm font-black text-white sm:text-base">
              {list.length.toLocaleString("ar-LY")} صور
            </div>

            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="
                inline-flex h-10 w-10 items-center justify-center
                rounded-full bg-white/10 text-white transition hover:bg-white/20
              "
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          {/* قائمة الصور عمودياً مع تمرير سلس */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-3xl">
              {list.map((src, i) => (
                <div
                  key={`lb-${src}-${i}`}
                  className="relative w-full border-b border-white/5 last:border-b-0"
                >
                  {/* رقم الصورة في الزاوية */}
                  <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-md sm:right-4 sm:top-4">
                    {(i + 1).toLocaleString("ar-LY")} / {list.length.toLocaleString("ar-LY")}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${alt}-full-${i + 1}`}
                    loading={i < 2 ? "eager" : "lazy"}
                    className="block h-auto w-full select-none"
                    draggable={false}
                  />
                </div>
              ))}
              {/* مسافة سفلية ناعمة لانتهاء التمرير */}
              <div className="h-8" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
