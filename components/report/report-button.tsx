"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ReportDialog } from "./report-dialog";
import type { ReportTargetType } from "@/lib/moderation/types";

/**
 * زر إبلاغ مدمج - يفتح ReportDialog عند الضغط.
 *
 * variant:
 *  - "icon": أيقونة فقط (للأماكن الضيقة، مثل قائمة تعليق)
 *  - "text": نص "إبلاغ" مع أيقونة (للأماكن الواسعة)
 *  - "ghost": رابط نصي خفيف
 *
 * يخفي نفسه لو المستخدم هو صاحب المحتوى (لا معنى للإبلاغ على نفسه).
 */

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  targetMeta?: {
    title?: string;
    ownerId?: string;
    parentListingId?: string;
    snapshot?: string;
  };
  variant?: "icon" | "text" | "ghost";
  /** classes إضافية للتخصيص. */
  className?: string;
}

export function ReportButton({
  targetType,
  targetId,
  targetMeta,
  variant = "text",
  className = "",
}: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  // إخفاء لصاحب المحتوى
  if (user && targetMeta?.ownerId === user.uid) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.warning("سجّل الدخول للإبلاغ.");
      return;
    }
    setOpen(true);
  };

  const baseClasses = "inline-flex items-center gap-1 font-bold transition";

  let visualClasses = "";
  switch (variant) {
    case "icon":
      visualClasses =
        "grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400";
      break;
    case "text":
      visualClasses =
        "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
      break;
    case "ghost":
      visualClasses =
        "text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400";
      break;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="إبلاغ"
        className={`${baseClasses} ${visualClasses} ${className}`}
      >
        <Flag size={variant === "icon" ? 14 : 12} />
        {variant !== "icon" && "إبلاغ"}
      </button>

      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetMeta={targetMeta}
      />
    </>
  );
}
