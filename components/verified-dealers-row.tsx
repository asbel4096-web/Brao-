"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { BadgeCheck, ChevronLeft, MapPin, Plus, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { getTraderDisplayName, formatNumber } from "@/lib/utils";

/** نحصر العدد كي لا يثقل الصفحة الرئيسية. */
const MAX_DEALERS = 12;

export function VerifiedDealersRow() {
  const [dealers, setDealers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchDealers = async () => {
      try {
        // استعلام بسيط بحقل واحد - لا يحتاج فهرساً مركّباً.
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("isVerifiedDealer", "==", true),
            limit(MAX_DEALERS)
          )
        );
        if (cancelled) return;

        const list: UserProfile[] = snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as any),
        }));

        // ترتيب client-side: الأعلى تقييماً ثم الأكثر إعلانات.
        list.sort((a, b) => {
          const ra = a.averageRating || 0;
          const rb = b.averageRating || 0;
          if (rb !== ra) return rb - ra;
          const la = a.listingsCount || 0;
          const lb = b.listingsCount || 0;
          return lb - la;
        });

        setDealers(list);
      } catch (err) {
        // إخفاء صامت - وجود قسم فارغ أفضل من رسالة خطأ مزعجة في الواجهة.
        // eslint-disable-next-line no-console
        console.warn("[VerifiedDealersRow] فشل جلب المعارض:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchDealers();
    return () => {
      cancelled = true;
    };
  }, []);

  // إخفاء القسم كلياً عند التحميل أو عدم وجود معارض.
  if (loading || dealers.length === 0) return null;

  // عندما يكون عدد المعارض قليلاً (1-3)، نُضيف بطاقة CTA "وثّق معرضك"
  // كي لا يظهر الصف فارغاً وتُستغلّ المساحة بطريقة مفيدة (دعوة لمزيد
  // من المعارض للانضمام بدلاً من ترك فجوة بصرية كبيرة).
  const showCta = dealers.length <= 3;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        {/* رأس القسم */}
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <BadgeCheck
              size={18}
              className="text-brand-700 dark:text-brand-300"
            />
            معارض السيارات الموثقة
          </h2>
          <Link
            href="/traders"
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
          >
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      {/*
        الشريط الأفقي - يخرج من الـcontainer ليصل إلى حواف الشاشة
        مع padding يضمن ظهور أول وآخر بطاقة بالكامل.
      */}
      <div
        className="
          flex gap-3 overflow-x-auto px-4 pb-2
          scrollbar-hide [&::-webkit-scrollbar]:hidden
          sm:px-6
        "
        style={{ scrollbarWidth: "none" }}
      >
        {dealers.map((dealer) => (
          <DealerCard key={dealer.uid} dealer={dealer} />
        ))}
        {showCta && <VerifyYourDealerCta />}
      </div>
    </section>
  );
}

/* ============================================================
 * VerifyYourDealerCta - بطاقة دعوة لتوثيق معرض
 * تظهر عندما يكون عدد المعارض الموثقة قليلاً.
 * ============================================================ */
function VerifyYourDealerCta() {
  return (
    <Link
      href="/dealer-verification"
      className="
        group flex w-[120px] shrink-0 flex-col items-center gap-1.5
        rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40
        p-1.5 transition active:scale-[0.97] hover:bg-brand-50
        dark:border-brand-700 dark:bg-brand-900/20
        dark:hover:bg-brand-900/40
        sm:w-[130px]
      "
    >
      <div
        className="
          flex h-[78px] w-[78px] items-center justify-center
          rounded-full bg-action-500 text-white shadow-action transition
          group-hover:bg-action-600 sm:h-[84px] sm:w-[84px]
        "
      >
        <Plus size={28} strokeWidth={2.5} />
      </div>
      <p className="line-clamp-1 w-full text-center text-[12px] font-black text-brand-700 dark:text-brand-300 sm:text-[13px]">
        وثّق معرضك
      </p>
      <p className="line-clamp-1 w-full text-center text-[10px] text-slate-500 dark:text-slate-400">
        اطلب التوثيق
      </p>
    </Link>
  );
}

/* ============================================================
 * DealerCard - بطاقة معرض موثَّق
 * ============================================================ */
function DealerCard({ dealer }: { dealer: UserProfile }) {
  const name = getTraderDisplayName(dealer);
  // الشعار له الأولوية على صورة الحساب.
  const photo = dealer.dealerLogo || dealer.photoURL;
  const initial = (name || "م").charAt(0).toUpperCase();
  const hasRating =
    typeof dealer.averageRating === "number" && dealer.averageRating > 0;

  return (
    <Link
      href={`/traders/${dealer.uid}`}
      className="
        group flex w-[120px] shrink-0 flex-col items-center gap-1.5
        rounded-2xl p-1.5 transition active:scale-[0.97]
        sm:w-[130px]
      "
    >
      {/* الصورة الدائرية + شارة التوثيق */}
      <div className="relative">
        <div
          className="
            relative h-[78px] w-[78px] overflow-hidden rounded-full
            ring-2 ring-slate-200 transition group-hover:ring-brand-300
            dark:ring-slate-700 dark:group-hover:ring-brand-600
            sm:h-[84px] sm:w-[84px]
          "
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={name}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500 text-2xl font-black text-white">
              {initial}
            </div>
          )}
        </div>

        {/* علامة التوثيق الزرقاء - أسفل يمين، بهوية براتشو */}
        <span
          aria-label="معرض موثق"
          className="
            absolute -bottom-0.5 -left-0.5 inline-flex h-6 w-6 items-center
            justify-center rounded-full border-2 border-white bg-brand-700
            text-white shadow-md
            dark:border-slate-900
          "
        >
          <BadgeCheck size={13} strokeWidth={2.5} />
        </span>
      </div>

      {/* الاسم */}
      <p className="line-clamp-1 w-full text-center text-[12px] font-black text-slate-900 dark:text-white sm:text-[13px]">
        {name}
      </p>

      {/* المدينة + التقييم في سطر صغير */}
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
        {dealer.city ? (
          <span className="inline-flex items-center gap-0.5">
            <MapPin size={9} />
            {dealer.city}
          </span>
        ) : null}
        {hasRating ? (
          <span className="inline-flex items-center gap-0.5">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            {dealer.averageRating!.toFixed(1)}
          </span>
        ) : null}
      </div>

      {/* عدد الإعلانات + المتابعين كنص صغير جداً */}
      {(dealer.listingsCount || dealer.followersCount) ? (
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
          {dealer.listingsCount ? (
            <span>{formatNumber(dealer.listingsCount)} إعلان</span>
          ) : null}
          {dealer.listingsCount && dealer.followersCount ? (
            <span aria-hidden="true">•</span>
          ) : null}
          {dealer.followersCount ? (
            <span>{formatNumber(dealer.followersCount)} متابع</span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
