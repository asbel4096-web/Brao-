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
import { BadgeCheck, ChevronLeft, MapPin, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { getTraderDisplayName, formatNumber } from "@/lib/utils";

/** نحصر العدد كي لا يثقل الصفحة الرئيسية. */
const MAX_DEALERS = 12;
/* ============================================================
 * cache بسيط في sessionStorage - يتفادى استعلام Firestore
 * عند كل ركوب للصفحة الرئيسية ضمن نفس الجلسة. الـTTL القصير
 * (5 دقائق) يضمن أن الإضافات الجديدة تظهر سريعاً.
 * ============================================================ */
const CACHE_KEY = "bratsho:verified-dealers:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(): UserProfile[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; list: UserProfile[] };
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return Array.isArray(parsed.list) ? parsed.list : null;
  } catch {
    return null;
  }
}

function writeCache(list: UserProfile[]) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), list })
    );
  } catch {
    /* تجاهل */
  }
}

export function VerifiedDealersRow() {
  // مهم: نبدأ بقيمة ثابتة (متطابقة سيرفر + عميل) لتفادي React #310.
  // الـcache يُقرأ داخل useEffect بعد الـhydration.
  const [dealers, setDealers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // قراءة الـcache بعد الـhydration (آمن الآن).
    const cached = readCache();
    if (cached !== null) {
      setDealers(cached);
      setLoading(false);
      return;
    }

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
        writeCache(list);
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
            المعارض المميزة
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
      </div>
    </section>
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
  const hasFollowers =
    typeof dealer.followersCount === "number" && dealer.followersCount > 0;
  const listingsCount =
    typeof dealer.listingsCount === "number" ? dealer.listingsCount : 0;

  return (
    <Link
      href={`/traders/${dealer.uid}`}
      className="
        group flex w-[104px] shrink-0 flex-col items-center gap-1
        rounded-2xl p-1 transition active:scale-[0.97]
        sm:w-[116px]
      "
    >
      {/* الصورة الدائرية بإطار Stories متدرّج + شارة التوثيق */}
      <div className="relative">
        <div
          className="
            rounded-full bg-gradient-to-tr from-action-500 via-brand-500 to-brand-700
            p-[2.5px] transition group-hover:from-action-400 group-hover:to-brand-600
            sm:p-[3px]
          "
        >
          <div
            className="
              relative h-[70px] w-[70px] overflow-hidden rounded-full
              ring-2 ring-white dark:ring-slate-900
              sm:h-[78px] sm:w-[78px]
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
        </div>

        {/* علامة التوثيق الزرقاء - أسفل يمين، بهوية براتشو */}
        <span
          aria-label="معرض موثق"
          className="
            absolute -bottom-0.5 -left-0.5 inline-flex h-5 w-5 items-center
            justify-center rounded-full border-2 border-white bg-brand-700
            text-white shadow-md
            dark:border-slate-900
            sm:h-6 sm:w-6
          "
        >
          <BadgeCheck size={11} strokeWidth={2.5} />
        </span>
      </div>

      {/* الاسم */}
      <p className="line-clamp-1 w-full text-center text-[12px] font-black text-slate-900 dark:text-white sm:text-[13px]">
        {name}
      </p>

      {/*
        السطر الأساسي: عدد سيارات المعرض (مثل التصميم). وإن لم يتوفر
        عدد، نعرض التقييم ثم المتابعين ثم المدينة كاحتياط.
      */}
      <div className="flex items-center justify-center gap-x-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
        {listingsCount > 0 ? (
          <span>{formatNumber(listingsCount)} سيارة</span>
        ) : hasRating ? (
          <span className="inline-flex items-center gap-0.5">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            {dealer.averageRating!.toFixed(1)}
          </span>
        ) : hasFollowers ? (
          <span>{formatNumber(dealer.followersCount!)} متابع</span>
        ) : dealer.city ? (
          <span className="inline-flex items-center gap-0.5">
            <MapPin size={9} />
            {dealer.city}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
