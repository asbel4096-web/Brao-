"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isBoostedNow, isFeaturedNow, isUrgentNow } from "@/lib/wallet/boost";

/**
 * Hook للأدمن - قائمة الإعلانات featured + boosted النشطة.
 *
 * يقرأ:
 *  - الإعلانات featured=true (نُفلتر المنتهية client-side)
 *  - الإعلانات لها boostedUntil (نُفلتر المنتهية client-side)
 *
 * تكلفة: ~50-100 reads عند الفتح. realtime.
 */

export interface BoostedListing {
  id: string;
  title?: string;
  ownerId?: string;
  ownerEmail?: string;
  status?: string;
  featured?: boolean;
  featuredUntil?: any;
  featuredAt?: any;
  featuredBy?: string;
  boostedUntil?: any;
  boostedAt?: any;
  urgentUntil?: any;
  urgentAt?: any;
  bumpedAt?: any;
  bumpCount?: number;
  images?: string[];
  price?: number;
}

export function useActiveBoosts() {
  const [featured, setFeatured] = useState<BoostedListing[]>([]);
  const [boosted, setBoosted] = useState<BoostedListing[]>([]);
  const [urgent, setUrgent] = useState<BoostedListing[]>([]);
  const [loading, setLoading] = useState(true);

  // الـfeatured: نقرأ كل featured=true
  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("featured", "==", true),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as BoostedListing[];
        // فلتر المنتهية
        const active = list.filter((l) => isFeaturedNow(l));
        setFeatured(active);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  // الـboosted: نقرأ الإعلانات لها boostedUntil في المستقبل
  useEffect(() => {
    // نقرأ آخر 200 إعلان معتمد ثم نفلتر الـboosted
    // (لا composite index لـboostedUntil + status)
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("boostedAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as BoostedListing[];
        const active = list.filter((l) => isBoostedNow(l));
        setBoosted(active);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[boosts] error:", err?.code);
      }
    );

    return () => unsub();
  }, []);

  // الـurgent: استعلام single-field على urgentUntil > now (مفهرس تلقائياً).
  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("urgentUntil", ">", Timestamp.now()),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as BoostedListing[];
        const active = list.filter((l) => isUrgentNow(l));
        setUrgent(active);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[urgent] error:", err?.code);
      }
    );

    return () => unsub();
  }, []);

  return {
    featured,
    boosted,
    urgent,
    loading,
    stats: {
      featuredCount: featured.length,
      boostedCount: boosted.length,
      urgentCount: urgent.length,
      totalActive: featured.length + boosted.length + urgent.length,
    },
  };
}
