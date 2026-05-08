"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, ShieldCheck, Star, Store, Users } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { getTraderDisplayName } from "@/lib/utils";

interface Props {
  /** ownerId من الإعلان (يُستخدم للرابط حتى لو الـ profile لم يحمَّل) */
  ownerId: string;
  /** بيانات التاجر إن حُمِّلت */
  seller: UserProfile | null;
  /** اسم البائع المخزَّن في الإعلان (fallback) */
  fallbackName?: string;
}

/**
 * بطاقة البائع الاحترافية:
 *
 * - صورة + اسم + شارة التوثيق.
 * - 3 إحصائيات سريعة (المتابعون / التقييم / عدد الإعلانات).
 * - زر "عرض صفحة التاجر" بارز.
 * - بدون أزرار تواصل (لتجنّب التكرار - أزرار التواصل في الـ sticky CTA).
 *
 * الفلسفة: هذه البطاقة تبني الثقة فقط، الإجراءات في مكان آخر.
 */
export function SellerCard({ ownerId, seller, fallbackName }: Props) {
  const name = getTraderDisplayName(seller || { name: fallbackName });
  // البائع يُعتبر "موثَّق" لو لديه أكثر من 3 إعلانات (يمكن استبدالها بحقل isVerified لاحقاً)
  const isVerified = Number(seller?.listingsCount || 0) >= 3;
  const rating = Number(seller?.averageRating || 0);
  const ratingsCount = Number(seller?.ratingsCount || 0);
  const followers = Number(seller?.followersCount || 0);
  const listings = Number(seller?.listingsCount || 0);

  return (
    <div className="card overflow-hidden p-0">
      <Link
        href={`/traders/${ownerId}`}
        className="block transition hover:bg-slate-50 dark:hover:bg-slate-950/40"
      >
        {/* الجزء العلوي: صورة + اسم + شارة + chevron */}
        <div className="flex items-center gap-3 p-4 sm:p-5">
          {seller?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seller.photoURL}
              alt={name}
              referrerPolicy="no-referrer"
              className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
            />
          ) : (
            <div
              className="
                flex h-14 w-14 shrink-0 items-center justify-center
                rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500
                text-xl font-black text-white shadow-blue
              "
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-black text-slate-950 dark:text-white sm:text-lg">
                {name}
              </h3>
              {isVerified && (
                <ShieldCheck
                  size={16}
                  className="shrink-0 text-brand-700 dark:text-brand-300"
                  aria-label="تاجر موثَّق"
                />
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {seller?.businessName && (
                <span className="inline-flex items-center gap-1">
                  <Store size={11} />
                  <span className="truncate">{seller.businessName}</span>
                </span>
              )}
              {seller?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {seller.city}
                </span>
              )}
            </div>
          </div>

          <ArrowLeft
            size={18}
            className="shrink-0 text-slate-400 transition group-hover:text-brand-700"
            aria-hidden="true"
          />
        </div>

        {/* الجزء السفلي: الإحصائيات */}
        <div
          className="
            grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100
            text-center text-[11px] sm:text-xs
            dark:divide-slate-800 dark:border-slate-800
            [direction:ltr]
          "
        >
          <Stat
            icon={Star}
            iconClass="text-amber-500"
            value={rating > 0 ? rating.toFixed(1) : "—"}
            label={ratingsCount > 0 ? `${ratingsCount} تقييم` : "تقييم"}
          />
          <Stat
            icon={Users}
            iconClass="text-brand-700 dark:text-brand-300"
            value={followers.toLocaleString("ar-LY")}
            label="متابع"
          />
          <Stat
            icon={Store}
            iconClass="text-emerald-600 dark:text-emerald-400"
            value={listings.toLocaleString("ar-LY")}
            label="إعلان"
          />
        </div>
      </Link>
    </div>
  );
}

function Stat({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: typeof Star;
  iconClass?: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="px-2 py-3 [direction:rtl]">
      <div className="flex items-center justify-center gap-1">
        <Icon size={13} className={iconClass} aria-hidden="true" />
        <span className="font-black text-slate-950 dark:text-white">{value}</span>
      </div>
      <div className="mt-0.5 text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
