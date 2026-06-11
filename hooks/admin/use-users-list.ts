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
 * Hook لجلب قائمة المستخدمين مع:
 *  - infinite scroll (load more on demand)
 *  - فلتر اختياري حسب status (admin/banned/verified/all)
 *  - بحث client-side في النتائج المحمّلة
 *
 * لاحظ:
 *  - النسخة الحالية تستخدم getDocs (One-shot) وليس onSnapshot لتجنّب
 *    re-renders كثيرة في جدول طويل. التغييرات تصل عبر reload يدوي بعد
 *    تنفيذ إجراء (ban/verify/...).
 *  - البحث client-side: يفلتر النتائج المحمّلة فقط (name/email/phone).
 *    لبحث كامل يحتاج Algolia/Typesense - مؤجَّل.
 */

export type UserFilter = "all" | "admins" | "banned" | "verified" | "deleted";

const PAGE_SIZE = 50;

export interface AdminUser {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  role?: string | null;
  isVerifiedDealer?: boolean;
  banned?: boolean;
  deleted?: boolean;
  bannedAt?: any;
  banReason?: string;
  createdAt?: any;
  lastActiveAt?: any;
  city?: string;
  businessName?: string;
}

interface State {
  items: AdminUser[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

export function useUsersList(filter: UserFilter, searchTerm: string) {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: true,
    lastDoc: null,
  });

  // بناء الـquery حسب الفلتر. ملاحظة: filters متعدّدة على
  // collection users قد تحتاج composite indexes. الفلاتر البسيطة
  // المُستخدمة هنا (banned==true، isVerifiedDealer==true، role!=null)
  // عادة لا تحتاج index مركّب إذا كانت مع orderBy(createdAt).
  const buildQuery = useCallback(
    (afterDoc: DocumentSnapshot | null) => {
      const constraints: QueryConstraint[] = [];

      switch (filter) {
        case "admins":
          constraints.push(where("isAdmin", "==", true));
          break;
        case "banned":
          constraints.push(where("banned", "==", true));
          break;
        case "verified":
          constraints.push(where("isVerifiedDealer", "==", true));
          break;
        case "deleted":
          constraints.push(where("deleted", "==", true));
          break;
        // "all" → لا فلتر
      }

      constraints.push(orderBy("createdAt", "desc"));
      if (afterDoc) constraints.push(startAfter(afterDoc));
      constraints.push(limit(PAGE_SIZE));

      return query(collection(db, "users"), ...constraints);
    },
    [filter]
  );

  // تحميل الدفعة الأولى
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
        })) as AdminUser[];
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
        console.error("[useUsersList] error:", err?.code, err?.message);
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

  // تحميل المزيد
  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || !state.lastDoc) return;
    setState((p) => ({ ...p, loadingMore: true }));

    try {
      const snap = await getDocs(buildQuery(state.lastDoc));
      const newItems = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as AdminUser[];
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

  // إعادة تحميل (بعد تنفيذ إجراء)
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
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as AdminUser[];
      setState({
        items,
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

  // فلترة client-side حسب البحث
  const filteredItems = state.items.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.businessName || "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return {
    items: filteredItems,
    rawItems: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    refresh,
  };
}
