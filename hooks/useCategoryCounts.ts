"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { categories } from "@/lib/categories";

/**
 * عدد الإعلانات (المعتمدة) لكل قسم — للصفحة الرئيسية (Explore Categories).
 *
 * - يستخدم getCountFromServer (عدّ خادمي كفؤ — لا يقرأ المستندات).
 * - status=="approved" مطلوب من قواعد الأمان.
 * - يَعُدّ بـ category == الاسم العربي للقسم (نفس تخزين Firestore).
 * - كل الأقسام بالتوازي.
 * - كاش جلسة 30 دقيقة (الأعداد لا تتغيّر كثيراً) لتقليل القراءات.
 * - عند الفشل: يُرجع ما توفّر (الواجهة تُخفي الرقم فقط، لا تنهار).
 *
 * المفتاح في الخريطة هو *اسم القسم العربي* (category) لأنه ما يُخزَّن.
 */

const CACHE_KEY = "bratsho:category-counts:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export function useCategoryCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // كاش
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS && parsed.counts) {
          setCounts(parsed.counts);
          return;
        }
      }
    } catch {}

    let cancelled = false;
    void (async () => {
      try {
        const listingsCol = collection(db, "listings");
        const results = await Promise.all(
          categories.map(async (c) => {
            try {
              const snap = await getCountFromServer(
                query(
                  listingsCol,
                  where("status", "==", "approved"),
                  where("category", "==", c.name)
                )
              );
              return [c.name, snap.data().count] as const;
            } catch {
              return [c.name, 0] as const;
            }
          })
        );
        if (cancelled) return;
        const map: Record<string, number> = {};
        results.forEach(([name, n]) => {
          map[name] = n;
        });
        setCounts(map);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), counts: map })
          );
        } catch {}
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[category-counts] failed:", (err as any)?.code);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
