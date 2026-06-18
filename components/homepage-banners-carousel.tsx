"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import type { HomepageBanner } from "@/lib/cms/types";

/**
 * Hero Banner Slider — الصفحة الرئيسية (بأسلوب Dubizzle / OpenSooq / Haraj).
 *
 * يُرسم مباشرة بعد القصص كـ Hero حقيقي (لا مجرد صورة داخل الصفحة).
 *
 * المزايا:
 *  - Auto Play كل 5 ثوانٍ (يتوقف عند تفاعل المستخدم: لمس/سحب).
 *  - Swipe يمين/يسار عبر scroll-snap (يحترم RTL).
 *  - Infinite Loop: بعد آخر شريحة يعود للأولى بسلاسة.
 *  - Pagination Dots سفلية فوق الصورة.
 *  - Smooth Transition (scroll-smooth + behavior:smooth).
 *  - Lazy Loading للصور غير الأولى، priority للأولى (LCP).
 *  - Skeleton أثناء التحميل (لا قفزة تخطيط).
 *  - يخفي نفسه تماماً لو لا بنرات نشطة (لا فراغ بصري).
 *
 * إصلاح مهم: كل الـHooks تُستدعى قبل أي return شرطي (قاعدة الـHooks)،
 * لتفادي أخطاء React #310/#418.
 */

interface Props {
  banners: HomepageBanner[];
  loading?: boolean;
}

const AUTOPLAY_MS = 5000;
const MOBILE_BREAKPOINT = 640;

/** هيكل تحميل (Skeleton) بنفس أبعاد الـHero. */
function BannerSkeleton() {
  return (
    <section className="container pt-3 sm:pt-4">
      <div className="aspect-[16/9] w-full animate-pulse rounded-[26px] bg-slate-200 sm:aspect-[5/2] dark:bg-slate-800" />
    </section>
  );
}

export function HomepageBannersCarousel({ banners, loading }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);

  const count = banners?.length ?? 0;

  // RTL: scrollLeft سالب في معظم المتصفحات الحديثة.
  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({
      left: dir * idx * el.clientWidth,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // تتبّع التمرير لتحديث المؤشّر النشط.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 1) return;
    const onScroll = () => {
      const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
      setActiveIdx(Math.min(Math.max(idx, 0), count - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  // Auto Play + Infinite Loop.
  useEffect(() => {
    if (count <= 1 || pausedByUser) return;
    const interval = setInterval(() => {
      const next = (activeIdx + 1) % count; // يعود للأولى بعد الأخيرة (loop)
      scrollToIdx(next);
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [activeIdx, count, pausedByUser, scrollToIdx]);

  // أثناء التحميل: Skeleton. وبعد كل الـHooks (قاعدة الـHooks).
  if (loading) return <BannerSkeleton />;
  if (!banners || count === 0) return null;

  const goPrev = () => {
    setPausedByUser(true);
    scrollToIdx((activeIdx - 1 + count) % count);
  };
  const goNext = () => {
    setPausedByUser(true);
    scrollToIdx((activeIdx + 1) % count);
  };

  return (
    <section className="container pt-3 sm:pt-4" aria-label="إعلانات مميزة">
      <div className="relative">
        <div
          ref={scrollRef}
          onTouchStart={() => setPausedByUser(true)}
          onPointerDown={() => setPausedByUser(true)}
          className="
            flex snap-x snap-mandatory overflow-x-auto scroll-smooth
            rounded-[26px]
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
        >
          {banners.map((b, i) => (
            <BannerSlide key={b.id} banner={b} idx={i} />
          ))}
        </div>

        {/* أزرار التوجيه — ديسكتوب فقط */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="السابق"
              className="
                absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2
                place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg
                backdrop-blur transition hover:bg-white
                dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900
                sm:grid
              "
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="التالي"
              className="
                absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2
                place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg
                backdrop-blur transition hover:bg-white
                dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900
                sm:grid
              "
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}

        {/* المؤشرات النقطية — فوق الصورة (أسفل) */}
        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPausedByUser(true);
                  scrollToIdx(i);
                }}
                aria-label={`الشريحة ${i + 1}`}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  activeIdx === i
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BannerSlide({ banner, idx }: { banner: HomepageBanner; idx: number }) {
  const hasText = Boolean(banner.title || banner.subtitle);

  const content = (
    <div
      className="
        relative aspect-[16/9] w-full shrink-0 snap-center overflow-hidden rounded-[26px]
        bg-slate-200 dark:bg-slate-900 sm:aspect-[5/2]
      "
    >
      {/* صورة الجوال (شاشات صغيرة) */}
      <Image
        src={banner.mobileImageUrl || banner.imageUrl}
        alt={banner.title || "بنر"}
        fill
        sizes="100vw"
        className="object-cover sm:hidden"
        priority={idx === 0}
        loading={idx === 0 ? undefined : "lazy"}
      />
      {/* صورة سطح المكتب (شاشات أكبر) */}
      <Image
        src={banner.imageUrl || banner.mobileImageUrl}
        alt={banner.title || "بنر"}
        fill
        sizes="(min-width: 768px) 1024px, 100vw"
        className="hidden object-cover sm:block"
        priority={idx === 0}
        loading={idx === 0 ? undefined : "lazy"}
      />

      {/* تدرّج احترافي من الأسفل لقراءة النص */}
      {hasText && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      )}

      {/* المحتوى النصّي + CTA اختياري */}
      {hasText && (
        <div className="absolute inset-x-0 bottom-0 p-4 pb-7 text-white sm:p-6 sm:pb-8">
          {banner.title && (
            <h3 className="text-lg font-black leading-tight drop-shadow-sm sm:text-2xl md:text-[26px]">
              {banner.title}
            </h3>
          )}
          {banner.subtitle && (
            <p className="mt-1 line-clamp-1 max-w-[90%] text-xs text-white/90 sm:text-sm">
              {banner.subtitle}
            </p>
          )}
          {banner.link && (
            <span
              className="
                mt-2.5 inline-flex items-center gap-1 rounded-full
                bg-action-500 px-3.5 py-1.5 text-[12px] font-black text-white
                shadow-lg sm:text-[13px]
              "
            >
              اعرض التفاصيل
              <ArrowLeft size={14} strokeWidth={2.5} />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (banner.link) {
    const isExternal = /^https?:\/\//i.test(banner.link);
    if (isExternal) {
      return (
        <a
          href={banner.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full shrink-0"
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={banner.link} prefetch={false} className="block w-full shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
