"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Hook لتحليلات الأدمن.
 *
 * يقرأ مرة واحدة (getDocs، ليس realtime) عند fixed-period (آخر 30 يوم):
 *  - كل users المُنشأين في الفترة
 *  - كل listings المُنشأة في الفترة
 *
 * ثم يحسب client-side:
 *  - بيانات يومية (Users per day, Listings per day)
 *  - Top cities (top 8)
 *  - Top categories (top 6)
 *  - Top brands (top 6)
 *  - مقارنة الأسبوع الحالي vs السابق
 *
 * تكلفة Firestore:
 *  - users = N reads (N = عدد المستخدمين في 30 يوم الأخيرة)
 *  - listings = N reads
 *  لمنصة بـ500 إعلان جديد شهرياً، التكلفة ~1000 reads لكل فتح للصفحة.
 *  Spark plan يسمح 50K reads/يوم → كافٍ لاستخدام الأدمن العادي.
 *
 * للنمو لاحقاً: نُحرّك للـserver-side aggregation (analytics/daily/{date}).
 *
 * الفترة 30 يوم ثابتة في هذه الجولة. يمكن جعلها param لاحقاً.
 */

const PERIOD_DAYS = 30;

export interface DailyPoint {
  /** Display label (e.g. "5 مايو") */
  date: string;
  /** ISO date YYYY-MM-DD (للـtooltip + sorting). */
  iso: string;
  count: number;
}

export interface TopItem {
  name: string;
  count: number;
}

export interface AnalyticsData {
  /** المستخدمون الجدد لكل يوم في الفترة. */
  usersDaily: DailyPoint[];
  /** الإعلانات الجديدة لكل يوم. */
  listingsDaily: DailyPoint[];

  /** Top items. */
  topCities: TopItem[];
  topCategories: TopItem[];
  topBrands: TopItem[];

  // Period totals
  usersInPeriod: number;
  listingsInPeriod: number;

  // مقارنة الأسبوع الحالي مقابل السابق (للـ% change)
  usersThisWeek: number;
  usersLastWeek: number;
  listingsThisWeek: number;
  listingsLastWeek: number;

  loading: boolean;
  error: string | null;
}

const EMPTY: AnalyticsData = {
  usersDaily: [],
  listingsDaily: [],
  topCities: [],
  topCategories: [],
  topBrands: [],
  usersInPeriod: 0,
  listingsInPeriod: 0,
  usersThisWeek: 0,
  usersLastWeek: 0,
  listingsThisWeek: 0,
  listingsLastWeek: 0,
  loading: true,
  error: null,
};

// Helpers
function isoOf(d: Date): string {
  // YYYY-MM-DD في الـUTC
  return d.toISOString().slice(0, 10);
}

function arabicShortDate(iso: string): string {
  // YYYY-MM-DD → "5 مايو"
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("ar-LY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * يبني slots يومية كاملة في الفترة (حتى لو يوم فاضي، يظهر كـ0).
 * بدون هذا، الـchart يقفز فجوات للأيام بدون داتا.
 */
function buildEmptyDaily(periodStart: Date, periodEnd: Date): DailyPoint[] {
  const out: DailyPoint[] = [];
  const cur = new Date(periodStart);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    const iso = isoOf(cur);
    out.push({ iso, date: arabicShortDate(iso), count: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function bumpDaily(daily: DailyPoint[], iso: string) {
  const slot = daily.find((d) => d.iso === iso);
  if (slot) slot.count += 1;
}

function aggregateTop(
  values: (string | undefined)[],
  topN: number
): TopItem[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    const key = String(v).trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }));
}

export function useAnalyticsData(): AnalyticsData {
  const [data, setData] = useState<AnalyticsData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - PERIOD_DAYS + 1);
        periodStart.setUTCHours(0, 0, 0, 0);

        const periodStartTs = Timestamp.fromDate(periodStart);

        // قراءة users + listings بالتوازي - أسرع
        const [usersSnap, listingsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "users"),
              where("createdAt", ">=", periodStartTs)
            )
          ),
          getDocs(
            query(
              collection(db, "listings"),
              where("createdAt", ">=", periodStartTs)
            )
          ),
        ]);

        if (cancelled) return;

        // Init daily slots
        const usersDaily = buildEmptyDaily(periodStart, now);
        const listingsDaily = buildEmptyDaily(periodStart, now);

        // مرور على users
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        let usersThisWeek = 0;
        let usersLastWeek = 0;
        const cities: string[] = [];

        usersSnap.forEach((d) => {
          const u = d.data() as any;
          const ts = u.createdAt?.toMillis?.();
          if (!ts) return;
          const date = new Date(ts);
          bumpDaily(usersDaily, isoOf(date));
          if (date >= oneWeekAgo) usersThisWeek++;
          else if (date >= twoWeeksAgo) usersLastWeek++;
          if (u.city) cities.push(u.city);
        });

        // مرور على listings
        let listingsThisWeek = 0;
        let listingsLastWeek = 0;
        const categories: string[] = [];
        const brands: string[] = [];
        const listingCities: string[] = [];

        listingsSnap.forEach((d) => {
          const l = d.data() as any;
          const ts = l.createdAt?.toMillis?.();
          if (!ts) return;
          const date = new Date(ts);
          bumpDaily(listingsDaily, isoOf(date));
          if (date >= oneWeekAgo) listingsThisWeek++;
          else if (date >= twoWeeksAgo) listingsLastWeek++;
          if (l.category) categories.push(l.category);
          if (l.brand) brands.push(l.brand);
          if (l.city) listingCities.push(l.city);
        });

        // top cities = مزيج من المستخدمين والإعلانات لرؤية أكثر اكتمالاً
        const allCities = [...cities, ...listingCities];

        setData({
          usersDaily,
          listingsDaily,
          topCities: aggregateTop(allCities, 8),
          topCategories: aggregateTop(categories, 6),
          topBrands: aggregateTop(brands, 6),
          usersInPeriod: usersSnap.size,
          listingsInPeriod: listingsSnap.size,
          usersThisWeek,
          usersLastWeek,
          listingsThisWeek,
          listingsLastWeek,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[useAnalyticsData]", err?.code, err?.message);
        setData((p) => ({
          ...p,
          loading: false,
          error: err?.message || "فشل تحميل التحليلات",
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/**
 * يحسب % التغيُّر بين عددين. يُرجع null إذا الـ"السابق" = 0
 * (تجنّب القسمة على 0 + لا معنى للنسبة عندما لا يوجد baseline).
 */
export function calculateChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
