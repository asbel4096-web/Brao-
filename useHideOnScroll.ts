"use client";

import { useEffect, useState } from "react";

interface Options {
  /** لا تُخفِ الشريط قبل تجاوز هذه المسافة من أعلى الصفحة. */
  topOffset?: number;
  /** أقل مسافة تمرير قبل الاستجابة (لتفادي الاهتزاز). */
  threshold?: number;
}

/**
 * useHideOnScroll — يرجع `hidden` (boolean) لشريط يُخفى عند التمرير لأسفل.
 *
 * السلوك المطلوب:
 *  - التمرير لأسفل  → يُخفى الشريط (hidden = true).
 *  - التوقّف        → يبقى على حاله (مخفياً إن كان مخفياً — لا يعود تلقائياً).
 *  - التمرير لأعلى  → يظهر الشريط (hidden = false).
 *  - قرب أعلى الصفحة → يظهر دائماً.
 *
 * يختلف عن useScrollDirection (الذي يعيد \"idle\" عند التوقّف فيُظهر الشريط):
 * هنا الحالة \"لاصقة\" — لا يظهر إلا بتمرير صريح لأعلى.
 */
export function useHideOnScroll({
  topOffset = 64,
  threshold = 6,
}: Options = {}): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;
    let accumulated = 0;
    let ticking = false;
    // نتتبّع الحالة محلياً لتفادي setState غير ضروري في كل إطار.
    let isHidden = false;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      // قرب القمة → أظهر دائماً.
      if (currentY < topOffset) {
        if (isHidden) {
          isHidden = false;
          setHidden(false);
        }
        accumulated = 0;
        lastY = currentY;
        ticking = false;
        return;
      }

      // تراكم الدلتا بنفس الاتجاه (يمنع الاهتزاز على التمرير اليدوي).
      if (Math.sign(delta) !== Math.sign(accumulated)) {
        accumulated = delta;
      } else {
        accumulated += delta;
      }

      if (Math.abs(accumulated) >= threshold) {
        const nextHidden = accumulated > 0; // نزول = إخفاء، صعود = إظهار
        if (nextHidden !== isHidden) {
          isHidden = nextHidden;
          setHidden(nextHidden);
        }
        accumulated = 0;
      }

      lastY = currentY;
      ticking = false;
      // ملاحظة: لا مؤقّت idle — عند التوقّف تبقى الحالة كما هي (لاصقة).
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [topOffset, threshold]);

  return hidden;
}
