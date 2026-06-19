"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FridayMarketItem } from "@/lib/friday-market/types";

/**
 * useMarketFeatured
 * إعلانات سوق الجمعة المميّزة (قسم أعلى الصفحة). يضبطها الأدمن (featured=true).
 *
 * فهرس مطلوب: fridayMarket: weekKey ASC, status ASC, featured ASC, featuredAt DESC
 */
export function useMarketFeatured(weekKey: string | null, max = 8) {
  const [items, setItems] = useState<FridayMarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!weekKey) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, "fridayMarket"),
          where("weekKey", "==", weekKey),
          where("status", "==", "active"),
          where("featured", "==", true),
          orderBy("featuredAt", "desc"),
          limit(max)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FridayMarketItem, "id">),
          }))
        );
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekKey, max]);

  return { items, loading };
}
