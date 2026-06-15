"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CAR_BRANDS } from "@/lib/car-brands";

/**
 * عدد الإعلانات (المعتمدة) لكل ماركة.
 *
 * - يستخدم getCountFromServer (عدّ خادمي كفؤ - لا يقرأ المستندات).
 * - status=="approved" مطلوب من قواعد الأمان.
 * - يعدّ كل الماركات بالتوازي.
 * - كاش جلسة 30 دقيقة (الأعداد لا تتغيّر كثيراً) لتقليل القراءات بشدّة.
 * - عند الفشل: يُرجع كائناً فارغاً (الواجهة تُخفي الرقم فقط، لا تنهار).
 */

const CACHE_KEY = "bratsho:brand-counts:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export function useBrandCounts(): Record<string, number> {
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
          CAR_BRANDS.map(async (b) => {
            try {
              const snap = await getCountFromServer(
                query(
                  listingsCol,
                  where("status", "==", "approved"),
                  where("brand", "==", b.id)
                )
              );
              return [b.id, snap.data().count] as const;
            } catch {
              return [b.id, 0] as const;
            }
          })
        );
        if (cancelled) return;
        const map: Record<string, number> = {};
        results.forEach(([id, n]) => {
          map[id] = n;
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
        console.warn("[brand-counts] failed:", (err as any)?.code);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
