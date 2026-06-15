"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { WalletTransaction } from "@/lib/wallet/types";

/**
 * Hook للمحفظة - يقرأ الرصيد + آخر المعاملات realtime.
 *
 * - balance: من users/{uid}.balance (realtime عبر AuthContext)
 *   * بما أن AuthContext يستمع لـuser doc، الرصيد يصل تلقائياً عند التغيير
 *   * لو الـbalance غير موجود → 0
 *
 * - transactions: آخر 20 معاملة (للعرض في الـwallet sheet)
 *   * realtime onSnapshot
 *   * فلتر userId == currentUser.uid
 *   * مرتَّبة حسب createdAt desc
 *   * تكلفة: ~20 reads عند الفتح + reads لكل تحديث
 *
 * الاستخدام:
 *   const { balance, transactions, loading } = useWallet();
 */

export interface UseWalletResult {
  balance: number;
  transactions: WalletTransaction[];
  loadingTransactions: boolean;
  /** للأدمن: عرض رصيد مستخدم آخر. */
  hasError: boolean;
}

export function useWallet(): UseWalletResult {
  const { profile, user } = useAuth();
  const balance = Number((profile as any)?.balance) || 0;

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);
    setHasError(false);

    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as WalletTransaction[]
        );
        setLoadingTransactions(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[wallet] transactions error:", err?.code);
        setHasError(true);
        setLoadingTransactions(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  return {
    balance,
    transactions,
    loadingTransactions,
    hasError,
  };
}

/**
 * Hook لقراءة معاملات مستخدم معيّن (للأدمن).
 * يفترض أن الـcaller أدمن - الـrules تفحص ذلك.
 */
export function useUserWalletForAdmin(uid: string | null) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as WalletTransaction[]
        );
        setLoading(false);
      },
      (err) => {
        setError(err?.message || "فشل التحميل");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { transactions, loading, error };
}
