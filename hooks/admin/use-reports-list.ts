"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  ReportDoc,
  ReportStatus,
  ReportTargetType,
} from "@/lib/moderation/types";

/**
 * Hook لجلب البلاغات للأدمن.
 *
 * One-shot (getDocs) وليس realtime - البلاغات لا تتغير كثيراً.
 * pagination بـinfinite scroll مثل users page.
 *
 * فلاتر:
 *  - status: pending/reviewing/resolved/dismissed/all
 *  - targetType: listing/comment/user/all
 *
 * Note: لاستعلام بـwhere متعدد + orderBy، Firestore قد يتطلب index مركّب.
 * نُبقي أبسط: where واحد فقط + orderBy(createdAt). الفلتر الثاني client-side.
 */

const PAGE_SIZE = 30;

export type StatusFilter = "all" | ReportStatus;
export type TypeFilter = "all" | ReportTargetType;

interface State {
  items: ReportDoc[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

export function useReportsList(statusFilter: StatusFilter, typeFilter: TypeFilter) {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: true,
    lastDoc: null,
  });

  // نستعلم بـstatus فقط على server (يحتاج index بسيط)، typeFilter client-side
  const buildQuery = useCallback(
    (after: DocumentSnapshot | null) => {
      const constraints: QueryConstraint[] = [];
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }
      constraints.push(orderBy("createdAt", "desc"));
      if (after) constraints.push(startAfter(after));
      constraints.push(limit(PAGE_SIZE));
      return query(collection(db, "reports"), ...constraints);
    },
    [statusFilter]
  );

  useEffect(() => {
    let cancelled = false;
    setState({
      items: [],
      loading: true,
      loadingMore: false,
      error: null,
      hasMore: true,
      lastDoc: null,
    });

    (async () => {
      try {
        const snap = await getDocs(buildQuery(null));
        if (cancelled) return;
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as ReportDoc[];
        setState({
          items,
          loading: false,
          loadingMore: false,
          error: null,
          hasMore: snap.size === PAGE_SIZE,
          lastDoc: snap.docs[snap.docs.length - 1] || null,
        });
      } catch (err: any) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[reports] error:", err?.code, err?.message);
        setState((p) => ({
          ...p,
          loading: false,
          error: err?.message || "فشل التحميل",
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || !state.lastDoc) return;
    setState((p) => ({ ...p, loadingMore: true }));
    try {
      const snap = await getDocs(buildQuery(state.lastDoc));
      const newItems = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as ReportDoc[];
      setState((p) => ({
        ...p,
        items: [...p.items, ...newItems],
        loadingMore: false,
        hasMore: snap.size === PAGE_SIZE,
        lastDoc: snap.docs[snap.docs.length - 1] || p.lastDoc,
      }));
    } catch (err: any) {
      setState((p) => ({
        ...p,
        loadingMore: false,
        error: err?.message || "فشل التحميل",
      }));
    }
  }, [buildQuery, state.lastDoc, state.hasMore, state.loadingMore]);

  const refresh = useCallback(async () => {
    setState({
      items: [],
      loading: true,
      loadingMore: false,
      error: null,
      hasMore: true,
      lastDoc: null,
    });
    try {
      const snap = await getDocs(buildQuery(null));
      setState({
        items: snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as ReportDoc[],
        loading: false,
        loadingMore: false,
        error: null,
        hasMore: snap.size === PAGE_SIZE,
        lastDoc: snap.docs[snap.docs.length - 1] || null,
      });
    } catch (err: any) {
      setState((p) => ({
        ...p,
        loading: false,
        error: err?.message || "فشل التحميل",
      }));
    }
  }, [buildQuery]);

  // فلتر client-side على typeFilter
  const filtered = state.items.filter((r) => {
    if (typeFilter === "all") return true;
    return r.targetType === typeFilter;
  });

  return {
    items: filtered,
    rawItems: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    refresh,
  };
}
