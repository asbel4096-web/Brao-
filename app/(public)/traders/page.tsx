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
import { BadgeCheck, MapPin, Star, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { getTraderDisplayName, formatNumber } from "@/lib/utils";

const MAX_DEALERS = 60;
const CACHE_KEY = "bratsho:all-verified-dealers:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * صفحة قائمة كل المعارض الموثقة.
 * - مُرتَّبة client-side حسب التقييم ثم عدد الإعلانات.
 * - cache 5 دقائق في sessionStorage.
 * - لو لا توجد معارض، رسالة بسيطة.
 */
export default function VerifiedDealersIndexPage() {
  const [dealers, setDealers] = useState<UserProfile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { ts: number; list: UserProfile[] };
      if (Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.list || [];
    } catch {
      /* تجاهل */
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return true;
      const parsed = JSON.parse(raw) as { ts: number; list: UserProfile[] };
      return Date.now() - parsed.ts >= CACHE_TTL_MS;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
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
        list.sort((a, b) => {
          const ra = a.averageRating || 0;
          const rb = b.averageRating || 0;
          if (rb !== ra) return rb - ra;
          const la = a.listingsCount || 0;
          const lb = b.listingsCount || 0;
          return lb - la;
        });
        setDealers(list);
        setLoading(false);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), list })
          );
        } catch {
          /* تجاهل */
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* الرأس */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-800 via-brand-700 to-ink p-5 text-white shadow-blue sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-action-500/25 blur-3xl"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <BadgeCheck size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black sm:text-2xl">
                معارض السيارات الموثقة
              </h1>
              <p className="mt-1 text-xs leading-6 text-white/85 sm:text-sm">
                معارض راجعها فريق براتشو وأكّد بياناتها. اضغط أي معرض لعرض إعلاناته.
              </p>
            </div>
          </div>
        </div>

        {/* الجسم */}
        {loading && dealers.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-3xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : dealers.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <BadgeCheck size={28} />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-900 dark:text-white">
              لا توجد معارض موثقة بعد
            </h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
              سيظهر هنا المعارض التي يتم توثيقها قريباً.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dealers.map((d) => (
              <DealerRow key={d.uid} dealer={d} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DealerRow({ dealer }: { dealer: UserProfile }) {
  const name = getTraderDisplayName(dealer);
  const photo = dealer.dealerLogo || dealer.photoURL;
  const initial = (name || "م").charAt(0).toUpperCase();
  const hasRating =
    typeof dealer.averageRating === "number" && dealer.averageRating > 0;

  return (
    <Link
      href={`/traders/${dealer.uid}`}
      className="
        group flex items-center gap-3 rounded-3xl border border-slate-200/70
        bg-white p-3 transition active:scale-[0.99]
        hover:border-brand-300 hover:shadow-card
        dark:border-slate-700/70 dark:bg-slate-900
        dark:hover:border-brand-700
      "
    >
      {/* الصورة + شارة التوثيق */}
      <div className="relative shrink-0">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-slate-200 group-hover:ring-brand-300 dark:ring-slate-700 dark:group-hover:ring-brand-600">
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
        <span
          aria-label="موثَّق"
          className="absolute -bottom-1 -left-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white shadow-md dark:border-slate-900"
        >
          <BadgeCheck size={12} strokeWidth={2.5} />
        </span>
      </div>

      {/* المعلومات */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
            {name}
          </h3>
          <BadgeCheck
            size={13}
            strokeWidth={2.5}
            className="shrink-0 text-brand-700 dark:text-brand-300"
          />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {dealer.city ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin size={10} />
              {dealer.city}
            </span>
          ) : null}
          {hasRating ? (
            <span className="inline-flex items-center gap-0.5">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {dealer.averageRating!.toFixed(1)}
            </span>
          ) : null}
          {dealer.followersCount ? (
            <span className="inline-flex items-center gap-0.5">
              <Users size={10} />
              {formatNumber(dealer.followersCount)}
            </span>
          ) : null}
        </div>
        {dealer.listingsCount ? (
          <div className="mt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {formatNumber(dealer.listingsCount)} إعلان
          </div>
        ) : null}
      </div>
    </Link>
  );
}
