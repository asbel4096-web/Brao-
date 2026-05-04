"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";

function cacheKey(userId: string | undefined, listingId: string) {
  return userId ? `${userId}:${listingId}` : `guest:${listingId}`;
}

const likesCache = new Map<string, boolean>();

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

      const listingRef = doc(db, "listings", listing.id);
      const likeRef = doc(db, "listings", listing.id, "likes", user.uid);

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
    },
    [user]
  );

  return { isLiked, loading, toggle };
}

export function useFollowTraderState(traderId: string) {
  const { user, profile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(Boolean(user));
  const isOwnProfile = useMemo(() => !!user && user.uid === traderId, [traderId, user]);

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
            profile?.businessName || profile?.name || user.displayName || user.email || user.phoneNumber || "مستخدم",
          followerPhoto: profile?.photoURL || user.photoURL || "",
          createdAt: serverTimestamp(),
        });
        tx.update(meRef, { followingCount: increment(1) });
        tx.update(traderRef, { followersCount: increment(1) });
      }
    });
  }, [profile?.businessName, profile?.name, profile?.photoURL, traderId, user]);

  return { isFollowing, loading, toggleFollow, isOwnProfile };
}

export function useCommentsCount(listingId: string, initialCount = 0) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const ref = doc(db, "listings", listingId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as Listing | undefined;
      setCount(Number(data?.commentsCount || 0));
    });
    return () => unsub();
  }, [listingId]);

  return count;
}

export async function canUserManageComment(commentOwnerId: string, currentUserId?: string | null, isAdmin?: boolean) {
  return !!currentUserId && (currentUserId === commentOwnerId || isAdmin === true);
}
