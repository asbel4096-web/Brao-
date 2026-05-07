"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";

function cacheKey(userId: string | undefined, listingId: string) {
  return userId ? `${userId}:${listingId}` : `guest:${listingId}`;
}

const likesCache = new Map<string, boolean>();

/* ============================================================
 * Shared listing counts cache + pub/sub
 *
 * عدة بطاقات قد تعرض نفس الإعلان (في الصفحة الرئيسية وفي
 * صفحة المفضلة مثلاً). نحتفظ بـ snapshot واحد لكل listingId
 * ونوزّع التحديثات على كل المشتركين.
 * ============================================================ */

interface CountsState {
  likesCount: number;
  commentsCount: number;
}

const countsCache = new Map<string, CountsState>();
const countsSubscribers = new Map<string, Set<(c: CountsState) => void>>();
const countsActiveListeners = new Map<string, () => void>();
const countsListenerCount = new Map<string, number>();

function notifyCounts(listingId: string, value: CountsState) {
  countsCache.set(listingId, value);
  countsSubscribers.get(listingId)?.forEach((fn) => fn(value));
}

/**
 * يجلب likesCount + commentsCount بشكل live من listings/{id}.
 *
 * مزايا:
 * - snapshot واحد مشترك بين كل المكوّنات لنفس listingId.
 * - يبدأ بقيمة initial (من الإعلان نفسه) لتفادي flicker.
 * - يدعم optimistic updates عبر `applyOptimisticDelta`.
 */
export function useListingCounts(
  listingId: string,
  initial: { likesCount?: number; commentsCount?: number } = {}
) {
  const initialState = useMemo<CountsState>(
    () => ({
      likesCount: Number(initial.likesCount || 0),
      commentsCount: Number(initial.commentsCount || 0),
    }),
    // intentional: نستخدم القيم كـ seed مرة واحدة
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listingId]
  );

  const [state, setState] = useState<CountsState>(
    () => countsCache.get(listingId) || initialState
  );

  useEffect(() => {
    if (!listingId) return;

    // اشترك في pub/sub
    let set = countsSubscribers.get(listingId);
    if (!set) {
      set = new Set();
      countsSubscribers.set(listingId, set);
    }
    const fn = (v: CountsState) => setState(v);
    set.add(fn);

    // إذا الكاش يحتوي قيمة، استخدمها فوراً
    const cached = countsCache.get(listingId);
    if (cached) setState(cached);

    // فعّل listener Firestore واحد لكل listingId مشترك
    const refCount = (countsListenerCount.get(listingId) || 0) + 1;
    countsListenerCount.set(listingId, refCount);

    if (!countsActiveListeners.has(listingId)) {
      const unsub = onSnapshot(
        doc(db, "listings", listingId),
        (snap) => {
          const data = snap.data() as Partial<Listing> | undefined;
          if (!data) return;
          notifyCounts(listingId, {
            likesCount: Number(data.likesCount || 0),
            commentsCount: Number(data.commentsCount || 0),
          });
        },
        () => {/* تجاهل بصمت */}
      );
      countsActiveListeners.set(listingId, unsub);
    }

    return () => {
      // إزالة المشترك
      const s = countsSubscribers.get(listingId);
      s?.delete(fn);
      if (s && s.size === 0) countsSubscribers.delete(listingId);

      // تقليل عدّاد listener وفصله إذا لم يبق مشتركون
      const left = (countsListenerCount.get(listingId) || 1) - 1;
      if (left <= 0) {
        countsListenerCount.delete(listingId);
        const unsub = countsActiveListeners.get(listingId);
        if (unsub) {
          unsub();
          countsActiveListeners.delete(listingId);
        }
      } else {
        countsListenerCount.set(listingId, left);
      }
    };
  }, [listingId]);

  return state;
}

/**
 * تطبيق delta فوري على عدّاد likes (optimistic).
 * يُنشر التحديث لكل المكوّنات المشتركة في نفس listingId.
 *
 * عند نجاح/فشل العملية على Firestore، الـ snapshot listener
 * سيُصحّح الرقم تلقائياً للقيمة الحقيقية.
 */
export function applyOptimisticLikeDelta(listingId: string, delta: number) {
  const current =
    countsCache.get(listingId) || { likesCount: 0, commentsCount: 0 };
  const next: CountsState = {
    ...current,
    likesCount: Math.max(0, current.likesCount + delta),
  };
  notifyCounts(listingId, next);
}

/* ============================================================
 * Like state (per-user) — هل أنا أعجبت بهذا الإعلان؟
 * ============================================================ */

export function useListingLikeState(listingId: string) {
  const { user } = useAuth();
  const key = cacheKey(user?.uid, listingId);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setIsLiked(false);
      setLoading(false);
      return;
    }

    if (likesCache.has(key)) {
      setIsLiked(Boolean(likesCache.get(key)));
      setLoading(false);
    }

    const ref = doc(db, "listings", listingId, "likes", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const value = snap.exists();
        likesCache.set(key, value);
        setIsLiked(value);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [key, listingId, user]);

  const toggle = useCallback(
    async (listing: Pick<Listing, "id" | "title" | "images" | "ownerId">) => {
      if (!user) throw new Error("يجب تسجيل الدخول أولاً.");

      // ✨ Optimistic: اعكس الحالة + غيّر العدّاد فوراً
      const willBeLiked = !isLiked;
      const delta = willBeLiked ? 1 : -1;
      likesCache.set(key, willBeLiked);
      setIsLiked(willBeLiked);
      applyOptimisticLikeDelta(listing.id, delta);

      const listingRef = doc(db, "listings", listing.id);
      const likeRef = doc(db, "listings", listing.id, "likes", user.uid);

      try {
        await runTransaction(db, async (tx) => {
          const likeSnap = await tx.get(likeRef);
          const exists = likeSnap.exists();

          if (exists) {
            tx.delete(likeRef);
            tx.delete(doc(db, "users", user.uid, "likedListings", listing.id));
            tx.update(listingRef, { likesCount: increment(-1) });
          } else {
            tx.set(likeRef, {
              userId: user.uid,
              listingId: listing.id,
              ownerId: listing.ownerId,
              title: listing.title,
              image: listing.images?.[0] || "",
              createdAt: serverTimestamp(),
            });
            tx.set(doc(db, "users", user.uid, "likedListings", listing.id), {
              listingId: listing.id,
              ownerId: listing.ownerId,
              createdAt: serverTimestamp(),
            });
            tx.update(listingRef, { likesCount: increment(1) });
          }
        });
      } catch (err) {
        // Rollback عند الفشل
        likesCache.set(key, !willBeLiked);
        setIsLiked(!willBeLiked);
        applyOptimisticLikeDelta(listing.id, -delta);
        throw err;
      }
    },
    [user, isLiked, key]
  );

  return { isLiked, loading, toggle };
}

/* ============================================================
 * Follow trader state
 * ============================================================ */

export function useFollowTraderState(traderId: string) {
  const { user, profile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(Boolean(user));
  const isOwnProfile = useMemo(
    () => !!user && user.uid === traderId,
    [traderId, user]
  );

  useEffect(() => {
    if (!user || isOwnProfile) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid, "following", traderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIsFollowing(snap.exists());
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [isOwnProfile, traderId, user]);

  const toggleFollow = useCallback(async () => {
    if (!user) throw new Error("يجب تسجيل الدخول للمتابعة.");
    if (user.uid === traderId) throw new Error("لا يمكنك متابعة حسابك.");

    const followingRef = doc(db, "users", user.uid, "following", traderId);
    const followerRef = doc(db, "users", traderId, "followers", user.uid);
    const meRef = doc(db, "users", user.uid);
    const traderRef = doc(db, "users", traderId);

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(followingRef);
      if (existing.exists()) {
        tx.delete(followingRef);
        tx.delete(followerRef);
        tx.update(meRef, { followingCount: increment(-1) });
        tx.update(traderRef, { followersCount: increment(-1) });
      } else {
        tx.set(followingRef, {
          traderId,
          createdAt: serverTimestamp(),
        });
        tx.set(followerRef, {
          followerId: user.uid,
          followerName:
            profile?.businessName ||
            profile?.name ||
            user.displayName ||
            user.email ||
            user.phoneNumber ||
            "مستخدم",
          followerPhoto: profile?.photoURL || user.photoURL || "",
          createdAt: serverTimestamp(),
        });
        tx.update(meRef, { followingCount: increment(1) });
        tx.update(traderRef, { followersCount: increment(1) });
      }
    });
  }, [
    profile?.businessName,
    profile?.name,
    profile?.photoURL,
    traderId,
    user,
  ]);

  return { isFollowing, loading, toggleFollow, isOwnProfile };
}

/* ============================================================
 * Backward compat
 * ============================================================ */

/** @deprecated استخدم useListingCounts بدلاً منه (يجمع likes+comments في snapshot واحد) */
export function useCommentsCount(listingId: string, initialCount = 0) {
  const { commentsCount } = useListingCounts(listingId, {
    commentsCount: initialCount,
  });
  return commentsCount;
}

export async function canUserManageComment(
  commentOwnerId: string,
  currentUserId?: string | null,
  isAdmin?: boolean
) {
  return (
    !!currentUserId && (currentUserId === commentOwnerId || isAdmin === true)
  );
}
