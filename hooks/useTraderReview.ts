"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  DocumentReference,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { TraderReview } from "@/lib/types";

interface UseTraderReviewResult {
  /** The signed-in user's own review of this trader, if any. */
  myReview: TraderReview | null;
  loading: boolean;
  /** True when the viewer is the trader (cannot review themselves). */
  isOwnProfile: boolean;
  canReview: boolean;
  /** Create or update the viewer's review. rating must be 1..5. */
  submitReview: (rating: number, comment: string) => Promise<void>;
  /** Delete the viewer's review. */
  removeReview: () => Promise<void>;
}

/**
 * Manages the signed-in user's single review for a given trader and keeps the
 * trader's averageRating / reviewsCount aggregates in sync via a transaction.
 *
 * Storage: users/{traderUid}/reviews/{reviewerUid}
 */
export function useTraderReview(traderUid: string): UseTraderReviewResult {
  const { user, profile } = useAuth();
  const [myReview, setMyReview] = useState<TraderReview | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !!user && user.uid === traderUid;
  const canReview = !!user && !isOwnProfile;

  useEffect(() => {
    if (!user || isOwnProfile) {
      setMyReview(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", traderUid, "reviews", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setMyReview(
          snap.exists() ? ({ ...(snap.data() as TraderReview), id: snap.id }) : null
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [isOwnProfile, traderUid, user]);

  const recomputeAggregates = useCallback(
    (
      tx: Transaction,
      traderRef: DocumentReference,
      reviews: { rating: number }[]
    ) => {
      const count = reviews.length;
      const avg =
        count === 0
          ? 0
          : Math.round(
              (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / count) *
                10
            ) / 10;
      tx.update(traderRef, { averageRating: avg, reviewsCount: count });
    },
    []
  );

  const submitReview = useCallback(
    async (rating: number, comment: string) => {
      if (!user) throw new Error("سجّل الدخول أولاً لتقييم التاجر.");
      if (user.uid === traderUid) throw new Error("لا يمكنك تقييم حسابك.");
      const safeRating = Math.round(Number(rating));
      if (!(safeRating >= 1 && safeRating <= 5)) {
        throw new Error("التقييم يجب أن يكون من 1 إلى 5.");
      }

      const reviewRef = doc(db, "users", traderUid, "reviews", user.uid);
      const traderRef = doc(db, "users", traderUid);
      const reviewerName =
        profile?.businessName ||
        profile?.name ||
        user.displayName ||
        user.email ||
        user.phoneNumber ||
        "مستخدم";
      const reviewerPhoto = profile?.photoURL || user.photoURL || "";

      // Read the full reviews list once (outside the tx) so we can recompute
      // accurate aggregates. The tx itself only writes the review + counters.
      const existingSnap = await getDocs(
        collection(db, "users", traderUid, "reviews")
      );
      const others = existingSnap.docs
        .filter((d) => d.id !== user.uid)
        .map((d) => ({ rating: Number((d.data() as TraderReview).rating) || 0 }));

      await runTransaction(db, async (tx) => {
        const current = await tx.get(reviewRef);
        const isNew = !current.exists();

        tx.set(
          reviewRef,
          {
            traderId: traderUid,
            reviewerId: user.uid,
            reviewerName,
            reviewerPhoto,
            rating: safeRating,
            comment: comment.trim(),
            updatedAt: serverTimestamp(),
            ...(isNew ? { createdAt: serverTimestamp() } : {}),
          },
          { merge: true }
        );

        recomputeAggregates(tx, traderRef, [
          ...others,
          { rating: safeRating },
        ]);
      });
    },
    [profile?.businessName, profile?.name, profile?.photoURL, recomputeAggregates, traderUid, user]
  );

  const removeReview = useCallback(async () => {
    if (!user) throw new Error("سجّل الدخول أولاً.");
    const reviewRef = doc(db, "users", traderUid, "reviews", user.uid);
    const traderRef = doc(db, "users", traderUid);

    const existingSnap = await getDocs(
      collection(db, "users", traderUid, "reviews")
    );
    const others = existingSnap.docs
      .filter((d) => d.id !== user.uid)
      .map((d) => ({ rating: Number((d.data() as TraderReview).rating) || 0 }));

    await runTransaction(db, async (tx) => {
      const current = await tx.get(reviewRef);
      if (current.exists()) tx.delete(reviewRef);
      recomputeAggregates(tx, traderRef, others);
    });
  }, [recomputeAggregates, traderUid, user]);

  return useMemo(
    () => ({ myReview, loading, isOwnProfile, canReview, submitReview, removeReview }),
    [myReview, loading, isOwnProfile, canReview, submitReview, removeReview]
  );
}
