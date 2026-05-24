"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Reply,
  Trash2,
  Share2,
  Copy,
  Flag,
  ChevronDown,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

/**
 * قائمة خيارات التعليق - تظهر بجانب التعليق بعد long-press أو زر options.
 *
 * تصميم:
 *  - بطاقة عمودية بحواف دائرية، خلفية slate-900 نصف شفافة + glass.
 *  - كل خيار يحتوي أيقونة (يسار) + label (RTL: لذلك تظهر أيقونة على
 *    اليسار وlabel على اليمين بشكل طبيعي مع dir="rtl"). الخيار الأخير
 *    "المزيد" يكشف خيارات إضافية (نسخ النص حالياً).
 *  - تموضع ذكي: تحت/فوق الـanchor حسب المساحة، مع clamp أفقي.
 *  - "حذف" يظهر بلون rose للتمييز.
 */

export type CommentMenuAction =
  | "reply"
  | "delete"
  | "share"
  | "copy"
  | "report";

interface Props {
  anchorRect: DOMRect;
  /** هل يحقّ للمستخدم الحذف؟ (صاحب التعليق / صاحب الإعلان / أدمن) */
  canDelete: boolean;
  /** هل التعليق ملك المستخدم؟ نخفي "بلاغ" في هذه الحالة. */
  isOwnComment: boolean;
  onAction: (action: CommentMenuAction) => void;
  onClose: () => void;
}

const MENU_WIDTH = 240;
const MENU_HEIGHT_ESTIMATE = 280;
const SCREEN_PADDING = 12;
const GAP = 8;

interface MenuItem {
  key: CommentMenuAction;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

export function CommentContextMenu({
  anchorRect,
  canDelete,
  isOwnComment,
  onAction,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => setMounted(true), []);

  // البنود الرئيسية (الترتيب يطابق RTL: من الأعلى للأسفل)
  const primary: MenuItem[] = [
    { key: "reply", label: "رد", icon: Reply },
    ...(canDelete
      ? ([{ key: "delete", label: "حذف", icon: Trash2, danger: true }] as MenuItem[])
      : ([] as MenuItem[])),
    { key: "share", label: "مشاركة التعليق", icon: Share2 },
    ...(!isOwnComment
      ? ([{ key: "report", label: "الإبلاغ عن تعليق", icon: Flag }] as MenuItem[])
      : ([] as MenuItem[])),
  ];

  // البنود الثانوية (تحت "المزيد")
  const secondary: MenuItem[] = [
    { key: "copy", label: "نسخ التعليق", icon: Copy },
  ];

  useEffect(() => {
    if (!mounted) return;

    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = menuRef.current?.getBoundingClientRect();
      const w = rect?.width || MENU_WIDTH;
      const h = rect?.height || MENU_HEIGHT_ESTIMATE;

      // ابدأ تحت الـanchor متمركزاً
      let top = anchorRect.bottom + GAP;

      // لو لن يكفي تحت، ضعه فوق
      if (top + h > vh - SCREEN_PADDING) {
        top = anchorRect.top - h - GAP;
      }
      // أخيراً clamp عمودي
      top = Math.max(SCREEN_PADDING, Math.min(top, vh - h - SCREEN_PADDING));

      // أفقياً: نُحاذي لليمين (RTL)، فالقائمة تبدأ من يمين الـanchor
      // لكن لو ستخرج يساراً، نُحاذي لليسار.
      let left = anchorRect.right - w;
      left = Math.max(SCREEN_PADDING, Math.min(left, vw - w - SCREEN_PADDING));

      setPos({ top, left });
    };

    calc();
    const raf = requestAnimationFrame(calc);

    const onScroll = () => onClose();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, showMore, anchorRect.top, anchorRect.left, anchorRect.width, anchorRect.height]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  const ready = pos !== null;

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAction(item.key);
        }}
        className={`
          flex w-full items-center justify-between gap-3
          px-4 py-3.5
          text-right text-[15px] font-semibold
          transition-colors
          ${item.danger
            ? "text-rose-300 hover:bg-rose-500/15 active:bg-rose-500/20"
            : "text-slate-100 hover:bg-white/10 active:bg-white/15"}
        `}
      >
        <span>{item.label}</span>
        <Icon
          size={20}
          className={item.danger ? "text-rose-300" : "text-slate-300"}
        />
      </button>
    );
  };

  const content = (
    <div
      ref={menuRef}
      role="menu"
      dir="rtl"
      style={{
        position: "fixed",
        top: ready ? pos!.top : -9999,
        left: ready ? pos!.left : -9999,
        width: MENU_WIDTH,
        zIndex: 1000,
        opacity: ready ? 1 : 0,
        transform: ready ? "scale(1) translateY(0)" : "scale(0.95) translateY(-4px)",
        transformOrigin: "top right",
        transition: "opacity 160ms ease-out, transform 200ms cubic-bezier(0.34, 1.4, 0.64, 1)",
      }}
    >
      <div
        className="
          overflow-hidden rounded-2xl
          border border-white/10
          bg-slate-900/90
          shadow-[0_25px_60px_-15px_rgba(7,18,38,0.65)]
          backdrop-blur-xl
        "
      >
        {primary.map(renderItem)}

        {secondary.length > 0 && (
          <>
            {showMore && (
              <>
                <div className="mx-3 h-px bg-white/10" />
                {secondary.map(renderItem)}
              </>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMore((v) => !v);
              }}
              className="
                flex w-full items-center justify-between gap-3
                border-t border-white/10
                px-4 py-3
                text-right text-[14px] font-semibold
                text-slate-300
                transition-colors hover:bg-white/5
              "
            >
              <span>{showMore ? "أقل" : "المزيد"}</span>
              {showMore ? (
                <MoreHorizontal size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
