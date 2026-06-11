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

/**
 * Hook لجلب activity logs (adminLogs collection) مع pagination.
 *
 * One-shot (لا realtime) - الـlogs لا تتغيّر، فقط تُضاف.
 * Pagination: 50 لكل دفعة + infinite scroll.
 *
 * فلتر اختياري: action prefix (مثلاً "user_*" لإجراءات المستخدمين فقط).
 */

const PAGE_SIZE = 50;

export interface AdminLogEntry {
  id: string;
  adminUid: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  createdAt?: any;
}

interface State {
  items: AdminLogEntry[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

const INITIAL: State = {
  items: [],
  loading: true,
  loadingMore: false,
  error: null,
  hasMore: true,
  lastDoc: null,
};

export type ActivityFilter = "all" | "users" | "listings" | "reports" | "broadcast";

const FILTER_PREFIXES: Record<ActivityFilter, string | null> = {
  all: null,
  users: "user_",
  listings: "listing_",
  reports: "report_",
  broadcast: "broadcast",
};

export function useActivityFeed(filter: ActivityFilter = "all") {
  const [state, setState] = useState<State>(INITIAL);

  const buildQuery = useCallback(
    (after: DocumentSnapshot | null) => {
      const constraints: QueryConstraint[] = [];
      // Note: Firestore لا يدعم prefix queries مباشرة على strings بسهولة.
      // الحل: نستخدم range query على action ("user_" ... "user_~")
      // أو نفلتر client-side. اخترنا client-side لتجنّب composite indexes.
      // الـtradeoff: نُحمّل أكثر مما نعرض. لمنصة بضع آلاف logs، مقبول.
      constraints.push(orderBy("createdAt", "desc"));
      if (after) constraints.push(startAfter(after));
      constraints.push(limit(PAGE_SIZE));
      return query(collection(db, "adminLogs"), ...constraints);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);

    (async () => {
      try {
        const snap = await getDocs(buildQuery(null));
        if (cancelled) return;
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as AdminLogEntry[];
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
        console.error("[useActivityFeed]", err?.code, err?.message);
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
      })) as AdminLogEntry[];
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

  // Filter client-side
  const prefix = FILTER_PREFIXES[filter];
  const filtered = prefix
    ? state.items.filter((l) => l.action.startsWith(prefix))
    : state.items;

  return {
    items: filtered,
    rawItems: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
  };
}
