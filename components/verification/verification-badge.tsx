"use client";

import { BadgeCheck, Store, Building2 } from "lucide-react";
import {
  getVerificationType,
  VERIFICATION_STYLES,
  type VerifiableUser,
  type VerificationType,
} from "@/lib/verification-type";

const ICONS = { BadgeCheck, Store, Building2 } as const;

interface Props {
  user?: VerifiableUser | null;
  /** فرض نوع معيّن بدل الاستنتاج (اختياري) */
  type?: VerificationType;
  /** الحجم: sm للبطاقات، md افتراضي، lg للملف الشخصي */
  size?: "sm" | "md" | "lg";
  /** عرض النص بجانب الأيقونة (افتراضي true). false = أيقونة فقط */
  showLabel?: boolean;
  /** استخدام النص المختصر */
  short?: boolean;
  className?: string;
}

/**
 * VerificationBadge - شارة التوثيق الموحّدة.
 *
 * تعرض الشارة المناسبة حسب نوع التوثيق:
 *   ✓ حساب موثق (أزرق) · 🏢 تاجر موثق (أخضر) · 🚗 معرض موثق (بنفسجي)
 *
 * لا تعرض شيئاً لو المستخدم غير موثَّق (return null).
 * تُستخدم في: البطاقات، التفاصيل، الملف، صفحة التاجر، المحادثات.
 */
export function VerificationBadge({
  user,
  type,
  size = "md",
  showLabel = true,
  short = false,
  className = "",
}: Props) {
  const vType = type || getVerificationType(user);
  if (!vType) return null;

  const style = VERIFICATION_STYLES[vType];
  const Icon = ICONS[style.icon];

  const sizeCls = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2.5 py-1 text-[11px] gap-1",
    lg: "px-3 py-1.5 text-[13px] gap-1.5",
  }[size];

  const iconSize = { sm: 11, md: 13, lg: 15 }[size];

  // أيقونة فقط (للأماكن الضيقة)
  if (!showLabel) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        title={style.label}
        aria-label={style.label}
      >
        <Icon
          size={iconSize}
          className={style.iconColor}
          strokeWidth={2.5}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-black ${sizeCls} ${style.cls} ${className}`}
      title={style.label}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {short ? style.shortLabel : style.label}
    </span>
  );
}

/**
 * VerificationIcon - أيقونة التوثيق فقط (بجانب الأسماء).
 * اختصار لـ <VerificationBadge showLabel={false} />.
 */
export function VerificationIcon({
  user,
  type,
  size = 14,
  className = "",
}: {
  user?: VerifiableUser | null;
  type?: VerificationType;
  size?: number;
  className?: string;
}) {
  const vType = type || getVerificationType(user);
  if (!vType) return null;

  const style = VERIFICATION_STYLES[vType];
  const Icon = ICONS[style.icon];

  return (
    <Icon
      size={size}
      className={`${style.iconColor} ${className}`}
      strokeWidth={2.5}
      aria-label={style.label}
    />
  );
}
