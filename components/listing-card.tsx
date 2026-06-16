"use client";

import Link from "next/link";
import Image from "next/image";
import { memo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  MessageCircle,
  Phone,
  Camera,
  Clock3,
  Star,
  Rocket,
  Crown,
  Zap,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  getTraderDisplayName,
  isListingFeatured,
  normalizeLibyanPhone,
  timeAgo,
  buildChatId,
} from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { trackEvent } from "@/lib/track-event";
import { VerificationBadge } from "@/components/verification/verification-badge";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const FALLBACK = "/icons/car-card.svg";

interface ListingCardProps {
  listing: Listing;
  /** أول 2-3 بطاقات في الـ fold تأخذ priority للحصول على LCP أفضل */
  priority?: boolean;
}

/**
 * بطاقة إعلان احترافية (بمستوى Dubizzle / OpenSooq).
 *
 * تحسينات هذه النسخة:
 *  - الصورة تشغل ~62% من ارتفاع البطاقة (aspect-[4/3] + معلومات مضغوطة).
 *  - شارة مميز/ممول/جديد أعلى الصورة بهوية Bratsho.
 *  - سطر مواصفات أكبر وأوضح (أيقونات 14 + نص 12).
 *  - شارة "تاجر موثق" / "حساب موثق" واضحة.
 *  - وقت النشر مع أيقونة ساعة ونص ("منذ ساعتين").
 *  - لا تُعرض المشاهدات للعامة إطلاقاً (خصوصية المالك).
 *  - تتبّع آمن للنقرات (واتساب/اتصال/مراسلة/مشاركة) عبر API.
 *  - مساحات بيضاء أكبر + ظلال أنعم.
 *
 * كل البيانات تُعرض فقط إن وُجدت → توافق كامل مع الإعلانات القديمة.
 */

function ListingCardImpl({ listing, priority = false }: ListingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;
  const imageCount = listing.images?.length || 0;
  const sellerName = getTraderDisplayName({ name: listing.sellerName });
  const detailsHref = `/listings/${listing.id}`;

  // إنشاء/فتح محادثة مع صاحب الإعلان (نفس منطق صفحة التفاصيل).
  // نستخدم setDoc(merge) دون قراءة مسبقة لتفادي رفض قراءة مستند غير موجود.
  const handleMessage = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackEvent(listing.id, "chat");

    if (!user) {
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }
    if (listing.ownerId === user.uid) {
      toast.warning("لا يمكنك مراسلة إعلانك الخاص.");
      return;
    }
    if (chatBusy) return;
    setChatBusy(true);
    try {
      const chatId = buildChatId(user.uid, listing.ownerId, listing.id);
      await setDoc(
        doc(db, "chats", chatId),
        {
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.images?.[0] || "",
          participants: [user.uid, listing.ownerId].sort(),
          participantsInfo: {
            [user.uid]: {
              name:
                profile?.businessName ||
                profile?.name ||
                user.displayName ||
                user.email ||
                user.phoneNumber ||
                "مستخدم",
              photoURL: profile?.photoURL || user.photoURL || "",
            },
            [listing.ownerId]: {
              name: sellerName,
              photoURL: "",
            },
          },
        },
        { merge: true }
      );
      router.push(`/messages/${chatId}`);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر فتح المحادثة.");
    } finally {
      setChatBusy(false);
    }
  };

  // مستوى الترقية: VIP > ممول > مميز > عادي
  const vipUntil = (listing as any).vipUntil?.toMillis?.() || 0;
  const isVip = vipUntil > Date.now();
  const boostedUntil = (listing as any).boostedUntil?.toMillis?.() || 0;
  const isBoosted = boostedUntil > Date.now();
  const featured = isListingFeatured(listing);

  // وسم "عاجل" مستقل — يظهر مع أي باقة ترقية أو بمفرده.
  const urgentUntil = (listing as any).urgentUntil?.toMillis?.() || 0;
  const isUrgent = urgentUntil > Date.now();

  const condition = (listing as any).vehicleCondition as string | undefined;
  const isNew = condition === "جديدة";

  const sellerAvatar =
    (listing as any).ownerAvatar || (listing as any).sellerAvatar || "";

  const posted = timeAgo((listing as any).createdAt);

  // شارة علوية واحدة بالأولوية: VIP > ممول > مميز > جديد
  // الألوان: VIP ذهبي · ممول أخضر · مميز أزرق
  const topBadge = isVip
    ? { label: "VIP", Icon: Crown, cls: "bg-amber-400 text-amber-950" }
    : isBoosted
    ? { label: "ممول", Icon: Rocket, cls: "bg-emerald-600 text-white" }
    : featured
    ? { label: "مميز", Icon: Star, cls: "bg-blue-600 text-white" }
    : isNew
    ? { label: "جديد", Icon: null, cls: "bg-white/95 text-slate-900 dark:bg-slate-800 dark:text-white" }
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`
        group flex h-full flex-col overflow-hidden
        rounded-3xl bg-white
        shadow-[0_2px_16px_-4px_rgba(15,18,38,0.08)]
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_12px_32px_-8px_rgba(28,56,156,0.25)]
        dark:bg-slate-900
        ${
          isVip
            ? "border-2 border-amber-400 ring-2 ring-amber-400/20 dark:border-amber-500"
            : "border border-slate-200/60 hover:border-brand-200 dark:border-slate-800 dark:hover:border-brand-700"
        }
      `}
      dir="rtl"
    >
      {/* ============ الصورة (تشغل الجزء الأكبر) ============ */}
      <Link href={detailsHref} className="relative block aspect-[4/3] overflow-hidden">
        {!imgLoaded && !isFallback && (
          <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800" />
        )}

        <Image
          src={img}
          alt={listing.title || "إعلان"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onLoad={() => setImgLoaded(true)}
          className={`
            object-cover transition-all duration-500 group-hover:scale-105
            ${isFallback ? "object-contain p-8 opacity-60" : ""}
            ${imgLoaded || isFallback ? "opacity-100" : "opacity-0"}
          `}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

        {/* شارة علوية (يمين) - باقة الترقية + وسم عاجل مكدّسان */}
        {(topBadge || isUrgent) && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {topBadge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-black shadow-sm backdrop-blur-sm ${topBadge.cls}`}
              >
                {topBadge.Icon && <topBadge.Icon size={12} strokeWidth={2.5} />}
                {topBadge.label}
              </span>
            )}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-sm">
                <Zap size={11} strokeWidth={2.5} />
                عاجل
              </span>
            )}
          </div>
        )}

        {/* زر الحفظ (يسار علوي) - Glassmorphism */}
        <div className="absolute left-3 top-3">
          <div
            className="grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white backdrop-blur-md ring-1 ring-white/30"
            onClick={(e) => {
              e.preventDefault();
              trackEvent(listing.id, "favorite");
            }}
          >
            <FavoriteButton listing={listing} size={17} className="!text-white" />
          </div>
        </div>

        {/* السعر (أسفل يمين) */}
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-baseline gap-1 rounded-2xl bg-brand-700 px-3.5 py-1.5 text-white shadow-lg">
            <span className="text-xl font-black leading-none">
              {formatPrice(listing.price)}
            </span>
          </span>
        </div>

        {/* عدّاد الصور (أسفل يسار) */}
        {imageCount > 1 && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <Camera size={12} />
              {imageCount}
            </span>
          </div>
        )}
      </Link>

      {/* ============ المحتوى (مضغوط) ============ */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* العنوان */}
        <Link href={detailsHref}>
          <h3 className="line-clamp-1 text-base font-black text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white">
            {listing.title}
          </h3>
        </Link>

        {/* سطر المواصفات - مبسّط (السنة + المدينة فقط لتقليل الازدحام).
            باقي التفاصيل (الوقود/ناقل الحركة/المسافة) تظهر في صفحة الإعلان. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {listing.year && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} className="text-brand-600/70" />
              {listing.year}
            </span>
          )}
          {listing.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} className="text-brand-600/70" />
              {listing.city}
            </span>
          )}
        </div>

        <div className="my-3 h-px bg-slate-100 dark:bg-slate-800" />

        {/* بيانات البائع + وقت النشر */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-600 to-brand-800 ring-1 ring-slate-200 dark:ring-slate-700">
              {sellerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sellerAvatar} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-white">
                  {(sellerName || "؟").charAt(0)}
                </span>
              )}
            </div>
            <span className="truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">
              {sellerName}
            </span>
          </div>

          {posted && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
              <Clock3 size={12} />
              {posted}
            </span>
          )}
        </div>

        {/* شارة التوثيق - النوع يُستنتَج من بيانات الإعلان */}
        <div className="mt-2">
          <VerificationBadge
            user={{
              verificationType: (listing as any).verificationType,
              isVerifiedDealer: (listing as any).isVerifiedDealer,
              verifiedUntil: (listing as any).verifiedUntil,
              businessName: (listing as any).businessName,
              dealerName: (listing as any).dealerName,
            }}
            size="sm"
            short
          />
        </div>

        {/* أزرار الإجراءات - مع تتبّع آمن */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!wa) {
                e.preventDefault();
                return;
              }
              trackEvent(listing.id, "whatsapp");
            }}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-2.5 text-[11px] font-black text-emerald-700 transition active:scale-95 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
            aria-label="واتساب"
          >
            <MessageCircle size={14} />
            واتساب
          </a>

          <a
            href={listing.phone ? `tel:${listing.phone}` : "#"}
            onClick={(e) => {
              if (!listing.phone) {
                e.preventDefault();
                return;
              }
              trackEvent(listing.id, "phone");
            }}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand-700 py-2.5 text-[11px] font-black text-white transition active:scale-95 hover:bg-brand-800"
            aria-label="اتصال"
          >
            <Phone size={14} />
            اتصال
          </a>

          <button
            type="button"
            onClick={handleMessage}
            disabled={chatBusy}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-50 py-2.5 text-[11px] font-black text-brand-700 transition active:scale-95 hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-900/20 dark:text-blue-300"
            aria-label="مراسلة"
          >
            <MessageCircle size={14} />
            مراسلة
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export const ListingCard = memo(ListingCardImpl, (prev, next) => {
  const a = prev.listing;
  const b = next.listing;
  return (
    a.id === b.id &&
    a.price === b.price &&
    a.title === b.title &&
    a.featured === b.featured &&
    a.images?.[0] === b.images?.[0] &&
    prev.priority === next.priority
  );
});

export default ListingCard;
