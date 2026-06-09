"use client";

import { MessageCircle, MessageSquare, Phone } from "lucide-react";
import type { Listing } from "@/lib/types";
import { normalizeLibyanPhone } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/track-event";

interface Props {
  listing: Pick<Listing, "id" | "phone" | "whatsapp">;
  onChat: () => void;
  chatLoading?: boolean;
}

/**
 * شريط CTA ثابت أسفل الشاشة (موبايل فقط):
 *
 * - يظهر دائماً ما عدا أثناء scroll للأسفل (يختفي مثل bottom-nav).
 * - 3 أزرار: واتساب (الأبرز) + اتصال + مراسلة.
 * - مرتفع 8px فوق الـ bottom-nav (z-index أعلى).
 * - يحترم safe-area للـ iPhone.
 */
export function ListingStickyCta({ listing, onChat, chatLoading }: Props) {
  const direction = useScrollDirection({
    topOffset: 100,
    threshold: 8,
    idleDelay: 200,
  });
  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const hidden = direction === "down";

  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40",
        "transition-transform duration-300 ease-out will-change-transform",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{
        // ندفع للأعلى بمقدار ارتفاع الـ bottom-nav (56px) + safe-area
        paddingBottom: "calc(56px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="
          mx-3 mb-2 flex items-stretch gap-2 rounded-2xl
          border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-md
          dark:border-slate-700/80 dark:bg-slate-900/95
        "
      >
        {/* مراسلة (دردشة داخل التطبيق) */}
        <button
          type="button"
          onClick={() => {
            trackEvent(listing.id, "chat");
            onChat();
          }}
          disabled={chatLoading}
          aria-label="مراسلة"
          className="
            inline-flex h-11 w-11 shrink-0 items-center justify-center
            rounded-xl border border-slate-200 bg-white
            text-slate-700 transition active:scale-95
            hover:border-brand-300 hover:bg-brand-50
            disabled:opacity-60
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
          "
        >
          <MessageSquare size={18} />
        </button>

        {/* اتصال */}
        {listing.phone && (
          <a
            href={`tel:${listing.phone}`}
            onClick={() => trackEvent(listing.id, "phone")}
            aria-label="اتصال"
            className="
              inline-flex h-11 w-11 shrink-0 items-center justify-center
              rounded-xl border border-slate-200 bg-white
              text-slate-700 transition active:scale-95
              hover:border-brand-300 hover:bg-brand-50
              dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
            "
          >
            <Phone size={18} />
          </a>
        )}

        {/* واتساب - الزر الأبرز (يأخذ المساحة المتبقية) */}
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent(listing.id, "whatsapp")}
            className="
              inline-flex h-11 flex-1 items-center justify-center gap-1.5
              rounded-xl bg-emerald-500 px-4
              text-sm font-black text-white
              shadow-md shadow-emerald-500/30
              transition active:scale-[0.98] hover:bg-emerald-600
            "
          >
            <MessageCircle size={18} />
            تواصل عبر واتساب
          </a>
        ) : (
          <button
            type="button"
            onClick={onChat}
            disabled={chatLoading}
            className="
              inline-flex h-11 flex-1 items-center justify-center gap-1.5
              rounded-xl bg-brand-700 px-4
              text-sm font-black text-white shadow-blue
              transition active:scale-[0.98] hover:bg-brand-800
              disabled:opacity-60
            "
          >
            <MessageSquare size={18} />
            {chatLoading ? "جارٍ الفتح..." : "ابدأ المحادثة"}
          </button>
        )}
      </div>
    </div>
  );
}
