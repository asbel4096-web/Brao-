"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FridayMarketItem } from "@/lib/friday-market/types";

/**
 * useMarketItems
 *
 * يجلب إعلانات سوق الجمعة لجلسة معيّنة (weekKey) مع:
 *  - Pagination عبر startAfter (يدعم Infinite Scroll)
 *  - فلترة بالقسم (server-side)
 *  - بحث نصّي بسيط (client-side على الصفحات المحمّلة)
 *  - تصميم يتحمّل أكثر من 100 ألف إعلان: لا نحمّل كل شيء، فقط صفحات صغيرة.
 *
 * الفهرس المطلوب في Firestore (مركّب):
 *   fridayMarket: weekKey ASC, status ASC, createdAt DESC
 *   fridayMarket: weekKey ASC, status ASC, category ASC, createdAt DESC
 */

const PAGE_SIZE = 12;

interface Options {
  weekKey: string | null;
  category?: string | null; // null/"all" = الكل
  /** نقرأ المؤرشفة بدل النشطة (لصفحات الأرشيف). */
  archived?: boolean;
  /** إيقاف الجلب (مثلاً قبل معرفة weekKey). */
  paused?: boolean;
}

export function useMarketItems({
  weekKey,
  category,
  archived = false,
  paused = false,
}: Options) {
  const [items, setItems] = useState<FridayMarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const reqIdRef = useRef(0);

  const status = archived ? "archived" : "active";

  const buildQuery = useCallback(
    (after?: QueryDocumentSnapshot<DocumentData> | null) => {
      const base = collection(db, "fridayMarket");
      const constraints: any[] = [
        where("weekKey", "==", weekKey),
        where("status", "==", status),
      ];
      if (category && category !== "all") {
        constraints.push(where("category", "==", category));
      }
      constraints.push(orderBy("createdAt", "desc"));
      if (after) constraints.push(startAfter(after));
      constraints.push(fbLimit(PAGE_SIZE));
      return query(base, ...constraints);
    },
    [weekKey, status, category]
  );

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!weekKey) return;
      const myReq = ++reqIdRef.current;
      if (reset) {
        setLoading(true);
        cursorRef.current = null;
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const snap = await getDocs(buildQuery(reset ? null : cursorRef.current));
        if (myReq !== reqIdRef.current) return; // طلب أحدث ألغى هذا

        const page = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FridayMarketItem, "id">),
        }));

        cursorRef.current = snap.docs[snap.docs.length - 1] || cursorRef.current;
        setHasMore(snap.size === PAGE_SIZE);
        setItems((prev) => (reset ? page : [...prev, ...page]));
      } catch (e: any) {
        if (myReq !== reqIdRef.current) return;
        setError(e?.message || "تعذّر تحميل الإعلانات");
        setHasMore(false);
      } finally {
        if (myReq === reqIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [weekKey, buildQuery]
  );

  // إعادة الجلب عند تغيّر الجلسة/القسم
  useEffect(() => {
    if (paused || !weekKey) {
      setItems([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setItems([]);
    setHasMore(true);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, category, status, paused]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || paused) return;
    fetchPage(false);
  }, [loading, loadingMore, hasMore, paused, fetchPage]);

  return { items, loading, loadingMore, hasMore, error, loadMore };
}
