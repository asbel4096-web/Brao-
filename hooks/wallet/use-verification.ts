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
import {
  daysUntilExpiry,
  isExpiringSoon,
  isVerifiedNow,
  type UserVerificationFields,
  type VerificationStatus,
} from "@/lib/wallet/verification";
import type { VerificationPlanKey } from "@/lib/wallet/types";

/**
 * Hook للمستخدم الحالي - حالة توثيقه.
 *
 * يقرأ من AuthContext (الـprofile محدَّث realtime).
 * لا reads إضافية.
 */
export function useMyVerification() {
  const { profile } = useAuth();
  const fields: UserVerificationFields = {
    verifiedUntil: (profile as any)?.verifiedUntil,
    verificationPlan: (profile as any)?.verificationPlan,
    verificationStatus: (profile as any)?.verificationStatus,
    verifiedSince: (profile as any)?.verifiedSince,
  };
  return {
    fields,
    isVerified: isVerifiedNow(fields),
    daysRemaining: daysUntilExpiry(fields),
    expiringSoon: isExpiringSoon(fields),
  };
}

/**
 * Hook للأدمن - قائمة كل المشتركين في التوثيق.
 *
 * فلتر تلقائي حسب tab:
 *  - "all": كل من له verificationStatus غير null
 *  - "active": active أو granted + verifiedUntil > now
 *  - "expiring": ينتهي خلال 7 أيام
 *  - "expired": verifiedUntil < now
 *
 * تكلفة: ~50 reads عند الفتح. realtime.
 */
export interface SubscribedUser {
  id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  verifiedUntil?: any;
  verificationPlan?: VerificationPlanKey;
  verificationStatus?: VerificationStatus;
  verifiedSince?: any;
}

export type SubscriptionsTab = "all" | "active" | "expiring" | "expired";

export function useSubscriptionsList(tab: SubscriptionsTab = "all") {
  const [users, setUsers] = useState<SubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // نقرأ كل المستخدمين لديهم verificationStatus
    // (نتجنّب where + orderBy لتجنّب composite index)
    const q = query(
      collection(db, "users"),
      where("verificationStatus", "in", ["active", "granted", "expired", "cancelled"]),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as SubscribedUser[];
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[subscriptions] error:", err?.code);
        setError(err?.message || "فشل التحميل");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // فلترة client-side حسب الـtab
  const now = Date.now();
  const filtered = users.filter((u) => {
    const ms = u.verifiedUntil?.toMillis?.();
    const isActive =
      (u.verificationStatus === "active" || u.verificationStatus === "granted") &&
      ms &&
      ms > now;
    const isExpired = !isActive;
    const daysLeft = ms ? Math.ceil((ms - now) / (1000 * 60 * 60 * 24)) : null;

    switch (tab) {
      case "all":
        return true;
      case "active":
        return isActive;
      case "expiring":
        return isActive && daysLeft !== null && daysLeft <= 7;
      case "expired":
        return isExpired;
    }
  });

  // ترتيب: الأقرب انتهاءً أولاً (لـactive/expiring)، الأحدث انتهاءً أولاً (للـexpired)
  filtered.sort((a, b) => {
    const ma = a.verifiedUntil?.toMillis?.() || 0;
    const mb = b.verifiedUntil?.toMillis?.() || 0;
    if (tab === "expired") return mb - ma; // الأحدث انتهاءً أولاً
    return ma - mb; // الأقرب انتهاءً أولاً
  });

  return {
    users: filtered,
    allUsers: users,
    loading,
    error,
  };
}
