"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTowFavorites } from "@/hooks/use-tow-favorites";
import { useToast } from "@/contexts/ToastContext";

/**
 * زر القلب لإضافة/إزالة ساحبة من المفضلة.
 *
 * يُستخدم في:
 *  - TowTruckCard (الزاوية العلوية اليمنى - RTL)
 *  - NearestTowCard (نفس الموقع)
 *  - popup الخريطة عبر FavoriteButtonStandalone (نسخة منفصلة)
 *
 * السلوك:
 *  - يُظهر animation pulse عند التبديل.
 *  - يعرض toast نجاح خفيف.
 *  - يطلب تسجيل دخول لو الزائر غير مسجَّل.
 *  - تتداخل مع Link/Card parents؟ نوقف propagation + preventDefault.
 */

interface Props {
  listingId: string;
  /** "sm" داخل grid cards، "md" داخل البطاقة الأفقية أو popup. */
  size?: "sm" | "md";
  /** ضع true إذا الزر فوق صورة داكنة (يستخدم خلفية بيضاء شفافة). */
  onDarkBg?: boolean;
}

const SIZES = {
  sm: { btn: "h-8 w-8", icon: 14 },
  md: { btn: "h-10 w-10", icon: 18 },
};

export function FavoriteButton({ listingId, size = "sm", onDarkBg = false }: Props) {
  const { isFavorite, toggle, signedIn } = useTowFavorites();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(false);

  const active = isFavorite(listingId);
  const { btn, icon } = SIZES[size];

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (!signedIn) {
      toast.warning("سجّل الدخول لحفظ ساحباتك المفضلة.");
      return;
    }

    setBusy(true);
    setBump(true);
    setTimeout(() => setBump(false), 280);

    try {
      const becameFavorite = await toggle(listingId);
      if (becameFavorite) {
        toast.success("تمت إضافة الساحبة إلى مفضلتك.");
      }
      // عند الإزالة لا نعرض toast (إجراء عكسي بسيط، لا يحتاج تأكيد).
    } catch (err: any) {
      if (err?.message === "UNAUTHENTICATED") {
        toast.warning("سجّل الدخول لحفظ ساحباتك المفضلة.");
      } else {
        toast.error("تعذّر تحديث المفضلة. حاول مجدداً.");
      }
    } finally {
      setBusy(false);
    }
  };

  // ستايل الخلفية:
  //  - على bg داكن: white/90 شفافة لتبدو فوق الصورة بوضوح
  //  - عادي: white كاملة مع ظل خفيف
  const bgClasses = onDarkBg
    ? "bg-white/90 backdrop-blur-sm hover:bg-white"
    : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      aria-pressed={active}
      className={`
        grid place-items-center rounded-full shadow-sm
        transition-all duration-200
        ${btn}
        ${bgClasses}
        ${bump ? "scale-125" : "scale-100"}
        ${busy ? "opacity-70" : "opacity-100"}
        active:scale-95
      `}
    >
      <Heart
        size={icon}
        strokeWidth={2.4}
        className={
          active
            ? "fill-rose-500 text-rose-500"
            : "text-slate-500 dark:text-slate-300"
        }
      />
    </button>
  );
}
