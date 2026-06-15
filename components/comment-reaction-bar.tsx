"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COMMENT_REACTIONS,
  type CommentReactionKey,
} from "@/lib/comment-reactions";

/**
 * شريط تفاعلات floating يظهر فوق التعليق (أو تحته إذا لم تتوفر مساحة).
 *
 * تصميم:
 *  - بطاقة glass داكنة مع حواف دائرية وظل ناعم.
 *  - 6 تفاعلات بحجم مريح للمس على الموبايل.
 *  - animation pop-in خفيف عند الظهور.
 *  - يتموضع ذكياً: فوق الـanchor افتراضياً، تحته لو المساحة فوق ضيّقة،
 *    ولا يتجاوز حواف الشاشة (clamp horizontal).
 *  - RTL يحفظ ترتيب التفاعلات (أول عنصر يميناً).
 *  - الإغلاق بالضغط خارجه أو Escape.
 *
 * يُستخدم عبر Portal حتى لا يتأثر بـoverflow الحاوية.
 */

interface Props {
  /** الـDOMRect للعنصر المرجعي (التعليق) عند الفتح. */
  anchorRect: DOMRect;
  /** التفاعل الحالي للمستخدم على هذا التعليق (إن وُجد). */
  current?: CommentReactionKey | null;
  /** يُستدعى عند اختيار تفاعل (نفس الحالي = إزالة). */
  onSelect: (key: CommentReactionKey) => void;
  /** يُستدعى للإغلاق (خارج/Escape/بعد اختيار). */
  onClose: () => void;
}

const BAR_WIDTH_ESTIMATE = 340; // تقدير للقياس قبل القياس الفعلي
const BAR_HEIGHT_ESTIMATE = 64;
const GAP = 10; // المسافة بين الـanchor والشريط
const SCREEN_PADDING = 12; // هامش من حواف الشاشة

export function CommentReactionBar({
  anchorRect,
  current,
  onSelect,
  onClose,
}: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR guard
  useEffect(() => setMounted(true), []);

  // حساب الموضع — بعد mount حتى نقرأ الأبعاد الفعلية للشريط.
  useEffect(() => {
    if (!mounted) return;

    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const barRect = barRef.current?.getBoundingClientRect();
      const barW = barRect?.width || BAR_WIDTH_ESTIMATE;
      const barH = barRect?.height || BAR_HEIGHT_ESTIMATE;

      // الافتراضي: فوق التعليق ومتمركز أفقياً.
      let top = anchorRect.top - barH - GAP;
      let placeBelow = false;

      // إذا الشريط سيخرج من أعلى الشاشة، ضعه تحت التعليق.
      if (top < SCREEN_PADDING) {
        top = anchorRect.bottom + GAP;
        placeBelow = true;
      }

      // وإذا حتى تحت لا يكفي، نُلصقه بأقرب حد.
      if (placeBelow && top + barH > vh - SCREEN_PADDING) {
        top = Math.max(SCREEN_PADDING, vh - barH - SCREEN_PADDING);
      }

      // أفقياً: نتمركز على منتصف الـanchor، ثم clamp ضمن الشاشة.
      const anchorCenter = anchorRect.left + anchorRect.width / 2;
      let left = anchorCenter - barW / 2;
      left = Math.max(SCREEN_PADDING, Math.min(left, vw - barW - SCREEN_PADDING));

      setPos({ top, left });
    };

    // مرّتان: مرة بقياس تقديري، ثم مرة بقياس فعلي بعد render.
    calc();
    const raf = requestAnimationFrame(calc);

    const onScrollOrResize = () => onClose();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, anchorRect.top, anchorRect.left, anchorRect.width, anchorRect.height]);

  // إغلاق بالـEscape + النقر خارجه
  useEffect(() => {
    if (!mounted) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDocPointer = (e: PointerEvent) => {
      const el = barRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    // pointerdown لتفادي conflict مع click الذي قد يكون ضمن الشريط نفسه
    document.addEventListener("pointerdown", onDocPointer, true);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDocPointer, true);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  // قبل حساب الموضع، نُخفي الشريط بـopacity:0 لكن نتركه في الـDOM حتى نقيس
  // أبعاده. هذا يمنع وميض على الموضع الافتراضي (0, 0).
  const ready = pos !== null;

  const content = (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="تفاعلات التعليق"
      dir="rtl"
      style={{
        position: "fixed",
        top: ready ? pos!.top : -9999,
        left: ready ? pos!.left : -9999,
        zIndex: 1000,
        opacity: ready ? 1 : 0,
        transform: ready ? "scale(1)" : "scale(0.85)",
        transformOrigin: "center bottom",
        transition: "opacity 160ms ease-out, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div
        className="
          flex items-center gap-1.5
          rounded-full
          border border-white/10
          bg-slate-900/85
          px-2 py-1.5
          shadow-[0_20px_50px_-12px_rgba(7,18,38,0.55)]
          backdrop-blur-xl
        "
      >
        {COMMENT_REACTIONS.map((r, idx) => {
          const isActive = current === r.key;
          return (
            <button
              key={r.key}
              type="button"
              aria-label={r.label}
              aria-pressed={isActive}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.key);
              }}
              className={`
                relative grid h-11 w-11 place-items-center rounded-full
                text-2xl leading-none
                transition-all duration-200 ease-out
                hover:scale-125 hover:-translate-y-1
                active:scale-110
                ${isActive ? "bg-white/15 ring-2 ring-white/40" : "hover:bg-white/10"}
              `}
              style={{
                // stagger: كل تفاعل يدخل بفارق صغير
                animation: `bratsho-reaction-in 280ms ${idx * 30}ms both cubic-bezier(0.34, 1.56, 0.64, 1)`,
              }}
            >
              <span aria-hidden>{r.emoji}</span>
              {isActive && (
                <span
                  className="absolute -bottom-1 h-1 w-1 rounded-full"
                  style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes bratsho-reaction-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.6); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
