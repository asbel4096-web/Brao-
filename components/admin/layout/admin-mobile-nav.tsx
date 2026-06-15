"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

/**
 * Mobile drawer - يعرض الـsidebar كـoverlay كامل الارتفاع.
 *
 * UX:
 *  - يُفتح من الضغط على hamburger في الـtopbar
 *  - يُغلق بـ: زر X، الضغط على overlay، اختيار link، أو ESC
 *  - يقفل scrolling للـbody أثناء الفتح
 *  - animation سلس (slide-in من اليمين في RTL)
 */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ open, onClose }: Props) {
  // قفل scroll الـbody
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC للإغلاق
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay داكن */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`
          fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm
          transition-opacity duration-200
          lg:hidden
          ${open ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
      />

      {/* Drawer - يأتي من اليمين في RTL */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-[260px] max-w-[85vw]
          transform shadow-xl transition-transform duration-200 ease-out
          lg:hidden
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة الإدارة"
      >
        {/* زر إغلاق */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="
            absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg
            text-slate-500 transition hover:bg-slate-100 hover:text-slate-900
            dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white
          "
        >
          <X size={16} />
        </button>

        <AdminSidebar mobile onNavigate={onClose} />
      </div>
    </>
  );
}
