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
import type { ReferralDoc } from "@/lib/wallet/referrals";

/**
 * Hook للمستخدم - بيانات إحالاته.
 *
 * يقرأ:
 *  - من AuthContext: referralCode, referralsCount, referredBy, referralRewardEarned
 *  - من Firestore (realtime): قائمة آخر 20 إحالة قام بها المستخدم
 *
 * تكلفة: ~20 reads عند الفتح + realtime updates.
 */

export function useMyReferrals() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const referralCode = (profile as any)?.referralCode || null;
  const referralsCount = Number((profile as any)?.referralsCount) || 0;
  const referredBy = (profile as any)?.referredBy || null;
  const isActivated = Boolean(referralCode);

  useEffect(() => {
    if (!user?.uid || !isActivated) {
      setReferrals([]);
      setLoadingList(false);
      return;
    }

    const q = query(
      collection(db, "referrals"),
      where("referrerUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReferrals(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ReferralDoc[]
        );
        setLoadingList(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[referrals] error:", err?.code);
        setLoadingList(false);
      }
    );

    return () => unsub();
  }, [user?.uid, isActivated]);

  return {
    referralCode,
    referralsCount,
    referredBy,
    isActivated,
    referrals,
    loadingList,
    completedCount: referrals.filter((r) => r.status === "completed").length,
    pendingCount: referrals.filter((r) => r.status === "pending").length,
  };
}

/**
 * Hook للأدمن - قائمة كل الإحالات.
 */
export function useAllReferrals() {
  const [referrals, setReferrals] = useState<ReferralDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "referrals"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReferrals(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ReferralDoc[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  // إحصاءات
  const total = referrals.length;
  const completed = referrals.filter((r) => r.status === "completed").length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const rewardsPaid = completed * 2 * 10; // 10 BC × طرفين × completed

  return {
    referrals,
    loading,
    stats: {
      total,
      completed,
      pending,
      rewardsPaid,
    },
  };
}
