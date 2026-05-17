"use client";

import { useState } from "react";
import type { CarBrand } from "@/lib/car-brands";

interface Props {
  brand: CarBrand;
  /** حجم الشعار بالبكسل (الإطار الخارجي). افتراضي 64. */
  size?: number;
  /** كلاسات إضافية على الإطار الخارجي. */
  className?: string;
}

/**
 * مكوّن شعار الماركة الموحَّد.
 *
 * - إذا وُجد `logoUrl` يعرض الصورة على خلفية بيضاء داخل إطار بحدود ناعمة.
 *   هذا يطابق نمط لقطة المرجع (شعارات داكنة على خلفية فاتحة).
 * - إذا غاب الـlogoUrl أو فشل تحميل الصورة، يعرض fallback أنيق:
 *   * خلفية متدرّجة بهوية براتشو (brand-700 → brand-500).
 *   * أول حرف من الاسم الإنجليزي بخط أبيض ثقيل.
 *   * لا "صورة مكسورة" أبداً.
 */
export function BrandLogo({ brand, size = 64, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!brand.logoUrl && !failed;
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
          src={brand.logoUrl}
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
