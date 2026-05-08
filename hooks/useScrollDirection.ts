"use client";

import { useEffect, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

interface Options {
  /** ابدأ بالإخفاء بعد هذه المسافة من الأعلى (لا تخفي في أول الصفحة) */
  topOffset?: number;
  /** المسافة المطلوبة بين تغييرَي الاتجاه قبل الاستجابة (لتفادي flicker) */
  threshold?: number;
  /** المدة بعد التوقف ليُعتبر idle (يُظهر الشريط) */
  idleDelay?: number;
}

/**
 * يرجع اتجاه التمرير الحالي:
 *  - "down" → المستخدم يمرّر للأسفل (يُخفى الشريط).
 *  - "up"   → المستخدم يمرّر للأعلى (يظهر الشريط).
 *  - "idle" → توقّف عن التمرير (يظهر الشريط).
 *
 * نفس سلوك Facebook/Instagram على الجوال.
 */
export function useScrollDirection({
  topOffset = 80,
  threshold = 8,
  idleDelay = 180,
}: Options = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;
    let accumulated = 0;
    let lastDirection: ScrollDirection = "idle";
    let ticking = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      // فوق الـ topOffset → دائماً مرئي
      if (currentY < topOffset) {
        if (lastDirection !== "idle") {
          lastDirection = "idle";
          setDirection("idle");
        }
        accumulated = 0;
        lastY = currentY;
        ticking = false;
        return;
      }

      // التراكم: نتجاوب فقط عندما يتجاوز delta الحد الأدنى
      // هذا يمنع flicker على scroll يدوي يهتز.
      if (Math.sign(delta) !== Math.sign(accumulated)) {
        accumulated = delta;
      } else {
        accumulated += delta;
      }

      if (Math.abs(accumulated) >= threshold) {
        const next: ScrollDirection = accumulated > 0 ? "down" : "up";
        if (next !== lastDirection) {
          lastDirection = next;
          setDirection(next);
        }
        accumulated = 0;
      }

      lastY = currentY;
      ticking = false;

      // اعتبره idle بعد توقف قصير
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (lastDirection !== "idle") {
          lastDirection = "idle";
          setDirection("idle");
        }
      }, idleDelay);
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [topOffset, threshold, idleDelay]);

  return direction;
}
