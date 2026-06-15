"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { TopupRequest, TopupStatus } from "@/lib/wallet/topup";

/**
 * Hook للمستخدم - طلباته الخاصة.
 */
export function useMyTopupRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "topupRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as TopupRequest[]
        );
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[topup-requests] error:", err?.code);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return { requests, loading, pendingCount };
}

/**
 * Hook للأدمن - كل الطلبات مع فلتر.
 */
export function useAdminTopupRequests(filter: TopupStatus | "all" = "pending") {
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // نقرأ كل الطلبات (مع limit عالٍ) ونفلتر client-side
    // لتجنّب composite index
    const q = query(
      collection(db, "topupRequests"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as TopupRequest[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    totalApproved: requests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  return { requests: filtered, allRequests: requests, loading, stats };
}
