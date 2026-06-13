"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomepageBanner } from "@/lib/cms/types";

/**
 * Carousel للبنرات في الصفحة الرئيسية.
 *
 * - يخفي نفسه لو لا توجد بنرات نشطة (لا فراغ بصري)
 * - swipe-friendly على الموبايل (scroll-snap)
 * - autoplay اختياري كل 5 ثوانٍ (يتوقف عند تفاعل المستخدم)
 * - مؤشرات نقطية أسفل
 * - أزرار توجيه على الديسكتوب فقط
 *
 * المنطق:
 *  - بنر واحد: عرض ثابت بلا أزرار
 *  - متعدّد: scroll-snap + indicators
 */

interface Props {
  banners: HomepageBanner[];
  loading?: boolean;
}

const AUTOPLAY_MS = 5000;

/** هيكل تحميل (Skeleton) للبنر أثناء جلب البيانات. */
function BannerSkeleton() {
  return (
    <section className="container pt-3 sm:pt-4">
      <div
        className="
          h-[140px] w-full animate-pulse rounded-3xl bg-slate-200
          sm:h-[180px] md:h-[220px] dark:bg-slate-800
        "
      />
    </section>
  );
}

export function HomepageBannersCarousel({ banners, loading }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);

  // أثناء التحميل: نعرض Skeleton (تجربة احترافية بدل قفزة مفاجئة)
  if (loading) return <BannerSkeleton />;

  // إخفاء كامل لو فاضي
  if (!banners || banners.length === 0) return null;

  // تتبع scroll لتحديث المؤشّر
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || banners.length <= 1) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      // RTL: scrollLeft سلبي في معظم المتصفحات الحديثة، نأخذ القيمة المطلقة
      const normalized = Math.abs(idx);
      setActiveIdx(normalized);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [banners.length]);

  // Autoplay
  useEffect(() => {
    if (banners.length <= 1 || pausedByUser) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const next = (activeIdx + 1) % banners.length;
      // في RTL، scrollLeft سلبي
      const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
      el.scrollTo({
        left: dir * next * el.clientWidth,
        behavior: "smooth",
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [activeIdx, banners.length, pausedByUser]);

  const scrollToIdx = (idx: number) => {
    setPausedByUser(true);
    const el = scrollRef.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: dir * idx * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="container py-3 sm:py-4">
      <div className="relative">
        <div
          ref={scrollRef}
          onTouchStart={() => setPausedByUser(true)}
          className="
            flex snap-x snap-mandatory gap-3 overflow-x-auto
            scroll-smooth rounded-3xl
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
        >
          {banners.map((b, i) => (
            <BannerSlide key={b.id} banner={b} idx={i} />
          ))}
        </div>

        {/* أزرار التوجيه - ديسكتوب فقط */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                scrollToIdx(Math.max(0, activeIdx - 1))
              }
              aria-label="السابق"
              className="
                absolute right-2 top-1/2 hidden -translate-y-1/2
                h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg
                backdrop-blur transition hover:bg-white
                dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900
                sm:grid
              "
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                scrollToIdx(Math.min(banners.length - 1, activeIdx + 1))
              }
              aria-label="التالي"
              className="
                absolute left-2 top-1/2 hidden -translate-y-1/2
                h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg
                backdrop-blur transition hover:bg-white
                dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900
                sm:grid
              "
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}

        {/* المؤشرات النقطية */}
        {banners.length > 1 && (
          <div className="mt-2 flex justify-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIdx(i)}
                aria-label={`الشريحة ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  activeIdx === i
                    ? "w-6 bg-action-500"
                    : "w-1.5 bg-slate-300 dark:bg-slate-700"
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
  const content = (
    <div
      className="
        relative h-[140px] w-full shrink-0 snap-center overflow-hidden rounded-3xl
        bg-slate-100 dark:bg-slate-900
        sm:h-[180px] md:h-[220px]
      "
    >
      <Image
        src={banner.mobileImageUrl || banner.imageUrl}
        alt={banner.title || "بنر"}
        fill
        sizes="(min-width: 768px) 1024px, 100vw"
        className="object-cover"
        priority={idx === 0}
        loading={idx === 0 ? undefined : "lazy"}
      />
      {(banner.title || banner.subtitle) && (
        <div
          className="
            absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
            p-4 text-white
            sm:p-5
          "
        >
          {banner.title && (
            <h3 className="text-base font-black sm:text-lg md:text-xl">
              {banner.title}
            </h3>
          )}
          {banner.subtitle && (
            <p className="mt-0.5 text-xs opacity-90 sm:text-sm">
              {banner.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (banner.link) {
    // رابط خارجي vs داخلي
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
