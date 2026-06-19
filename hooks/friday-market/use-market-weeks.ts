"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FridayMarketWeek } from "@/lib/friday-market/types";

/**
 * useMarketWeeks
 * قائمة جلسات الجمعة السابقة (للأرشيف). تُقرأ من fridayMarketWeeks
 * المُحدَّثة server-side عند كل نشر.
 */
export function useMarketWeeks(max = 30) {
  const [weeks, setWeeks] = useState<FridayMarketWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, "fridayMarketWeeks"),
          orderBy("fridayISO", "desc"),
          limit(max)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setWeeks(
          snap.docs.map((d) => ({
            weekKey: d.id,
            ...(d.data() as Omit<FridayMarketWeek, "weekKey">),
          }))
        );
      } catch {
        if (!cancelled) setWeeks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [max]);

  return { weeks, loading };
}
