"use client";

import { useState } from "react";
import type { CarBrand } from "@/lib/car-brands";

interface Props {
  brand: CarBrand;
  /** حجم الشعار بالبكسل (الإطار الخارجي). افتراضي 64. */
  size?: number;
  /** كلاسات إضافية على الإطار الخارجي. */
  className?: string;
  /**
   * رابط الشعار من Firestore (collection brandLogos) - له الأولوية على
   * brand.logoUrl الثابت في القائمة. يُمرَّر من المكوّن الأعلى الذي
   * يستخدم useBrandLogos().
   */
  overrideUrl?: string;
}

/**
 * مكوّن شعار الماركة الموحَّد.
 *
 * أولوية مصدر الصورة:
 * 1) overrideUrl (من Firestore، يديره الأدمن من /admin/brands).
 * 2) brand.logoUrl (ثابت في lib/car-brands.ts).
 * 3) Fallback: دائرة بهوية براتشو + الحرف الأول.
 *
 * onError يقفز للـfallback إذا فشل تحميل الصورة.
 */
export function BrandLogo({ brand, size = 64, className = "", overrideUrl }: Props) {
  const [failed, setFailed] = useState(false);
  const src = overrideUrl || brand.logoUrl;
  const showImage = !!src && !failed;
  const initial = brand.nameEn.charAt(0).toUpperCase();

  return (
    <div
      className={`
        relative flex shrink-0 items-center justify-center overflow-hidden
        rounded-2xl
        ${showImage ? "bg-white" : "bg-gradient-to-br from-brand-700 to-brand-500"}
        ${className}
      `}
      style={{ width: size, height: size }}
      aria-label={brand.nameAr}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={brand.nameEn}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-3/4 w-3/4 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="select-none font-black leading-none text-white"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
