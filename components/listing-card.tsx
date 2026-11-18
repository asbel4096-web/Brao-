"use client";

import Link from "next/link";
import Image from "next/image";
import { memo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock3, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Listing } from "@/lib/types";
import {
  getTraderDisplayName,
  normalizeLibyanPhone,
  timeAgo,
  buildChatId,
} from "@/lib/utils";
import { isVipListing, listingHeadline } from "@/lib/listing-display";
import { FavoriteButton } from "./favorite-button";
import { NoImage, PhotoCount, PriceLine, PromoBadges, SpecRow } from "./vehicle-card-parts";
import { trackEvent } from "@/lib/track-event";
import { VerificationBadge } from "@/components/verification/verification-badge";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface ListingCardProps {
  listing: Listing;
  /** أول 2-3 بطاقات في الـ fold تأخذ priority للحصول على LCP أفضل */
  priority?: boolean;
}

/**
 * بطاقة الإعلان — Bratsho DS 1.0 (نفس المواصفة في تطبيق Flutter: BratshoVehicleCard).
 *
 *  - صورة 4:3 ثابتة (لا قفز في التخطيط)، وبديل «لا توجد صورة» بدل حاوية فارغة.
 *  - شارات الترويج أعلى الصورة (VIP > عاجل > مميز > ممول > جديد، حد أقصى 2).
 *  - المفضلة: قلب في دائرة بيضاء خارج رابط الصورة (لا عناصر تفاعلية متداخلة).
 *  - عنوان السيارة = الماركة + الموديل + السنة (قرار ق٢)، والسعر بخط Inter أسفل العنوان.
 *  - المواصفات حسب القسم ومن البيانات الموجودة فقط.
 *  - البائع والتوثيق وأزرار التواصل السريع: ميزات الموقع الحالية محفوظة بأسلوب المواصفة.
 *  - لا تُعرض المشاهدات للعامة (خصوصية المالك) — كما كان.
 */
function ListingCardImpl({ listing, priority = false }: ListingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const img = listing.images?.[0] || "";
  const isFallback = !listing.images?.length;
  const imageCount = listing.images?.length || 0;
  const sellerName = getTraderDisplayName({ name: listing.sellerName });
  const detailsHref = `/listings/${listing.id}`;
  const headline = listingHeadline(listing);
  const negotiable = (listing as any).negotiable === true;

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

  const sellerAvatar =
    (listing as any).ownerAvatar || (listing as any).sellerAvatar || "";

  const posted = timeAgo((listing as any).createdAt);
  // «تمييز بصري خاص» لباقة VIP كما في الإنتاج: إطار ذهبي حول البطاقة
  const isVip = isVipListing(listing);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`
        group flex h-full flex-col overflow-hidden
        rounded-3xl bg-white shadow-card
        transition-all duration-300 hover:-translate-y-0.5
        dark:bg-slate-900
        ${
          isVip
            ? "border-2 border-amber-400 ring-2 ring-amber-400/20 dark:border-amber-500"
            : "border border-slate-200/80 hover:border-brand-200 dark:border-slate-700/80 dark:hover:border-brand-700"
        }
      `}
      dir="rtl"
    >
      {/* ============ الصورة 4:3 ============ */}
      <div className="relative">
        <Link
          href={detailsHref}
          className="relative block aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800"
          aria-label={headline}
        >
          {isFallback ? (
            <NoImage />
          ) : (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800" />
              )}
              <Image
                src={img}
                alt={headline}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                loading={priority ? undefined : "lazy"}
                onLoad={() => setImgLoaded(true)}
                className={`object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              />
            </>
          )}
          <PromoBadges listing={listing} />
          <PhotoCount count={imageCount} />
        </Link>

        {/* المفضلة (نهاية RTL = يسار) — خارج الرابط.
            المعالج كما هو في الإنتاج حرفياً (مرحلة bubble): FavoriteButton يوقف الانتشار،
            فلا يُرسَل حدث favorite من البطاقة — لا نغيّر سلوك عدّاد favoritesCount في مرحلة التصميم. */}
        <div
          className="absolute left-0.5 top-0.5"
          onClick={(e) => {
            e.preventDefault();
            trackEvent(listing.id, "favorite");
          }}
        >
          <FavoriteButton listing={listing} size={18} />
        </div>
      </div>

      {/* ============ المحتوى ============ */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <Link href={detailsHref}>
          <h3
            className="truncate text-[15px] font-bold leading-[22px] text-slate-950 transition-colors group-hover:text-brand-700 dark:text-white"
            title={headline}
          >
            {headline}
          </h3>
        </Link>

        <PriceLine price={listing.price} negotiable={negotiable} />
        <SpecRow listing={listing} />

        {/* المدينة + وقت النشر */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11.5px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {listing.city ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0" />
              {listing.city}
            </span>
          ) : (
            <span />
          )}
          {posted && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock3 size={12} />
              {posted}
            </span>
          )}
        </div>

        {/* البائع + شارة التوثيق (من بيانات الإعلان فقط) */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-600 to-brand-800">
              {sellerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sellerAvatar} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-extrabold text-white">
                  {(sellerName || "؟").charAt(0)}
                </span>
              )}
            </div>
            <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
              {sellerName}
            </span>
          </div>
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

        {/* أزرار التواصل السريع — مع تتبّع آمن (ميزة الموقع الحالية) */}
        <div className="mt-1 grid grid-cols-3 gap-1.5">
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
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-900/30 dark:text-emerald-300"
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
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-brand-700 text-xs font-bold text-white transition hover:bg-brand-800 active:scale-95"
            aria-label="اتصال"
          >
            <Phone size={14} />
            اتصال
          </a>

          <button
            type="button"
            onClick={handleMessage}
            disabled={chatBusy}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-brand-50 text-xs font-bold text-brand-700 transition hover:bg-brand-100 active:scale-95 disabled:opacity-60 dark:bg-brand-900/40 dark:text-brand-200"
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
