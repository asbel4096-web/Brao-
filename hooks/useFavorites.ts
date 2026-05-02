"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Favorite, Listing } from "@/lib/types";

/**
 * Hook ثقيل: يحمّل كل المفضلة كقائمة كاملة.
 * استعمله فقط في صفحة /favorites حيث نحتاج العرض الكامل.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    const colRef = collection(db, "users", user.uid, "favorites");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const items: Favorite[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setFavorites(items);
        setFavoriteIds(new Set(items.map((f) => f.listingId)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user]);

  const isFavorited = useCallback(
    (listingId: string) => favoriteIds.has(listingId),
    [favoriteIds]
  );

  const toggle = useCallback(
    async (listing: Pick<Listing, "id" | "title" | "price" | "city" | "category" | "images">) => {
      if (!user) throw new Error("يجب تسجيل الدخول لإضافة المفضلة.");
      const ref = doc(db, "users", user.uid, "favorites", listing.id);
      if (favoriteIds.has(listing.id)) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          listingId: listing.id,
          userId: user.uid,
          createdAt: serverTimestamp(),
          snapshot: {
            title: listing.title,
            price: Number(listing.price) || 0,
            city: listing.city,
            category: listing.category,
            image: listing.images?.[0] || "",
          },
        });
      }
    },
    [user, favoriteIds]
  );

  return { favorites, favoriteIds, isFavorited, toggle, loading };
}

/**
 * Hook خفيف: حالة المفضلة لإعلان واحد فقط.
 * ✨ تحسين الأداء: لا يفتح onSnapshot على كل المفضلة - يستخدم getDoc لمرة واحدة
 *    + كاش محلي مشترك بين كل instances في نفس الجلسة.
 *
 * استعمله في FavoriteButton داخل listing cards (40+ بطاقة على الصفحة).
 */
const favCache = new Map<string, boolean>();
const subscribers = new Map<string, Set<(v: boolean) => void>>();

function notifyKey(key: string, value: boolean) {
  favCache.set(key, value);
  subscribers.get(key)?.forEach((fn) => fn(value));
}

export function useFavoriteState(listingId: string) {
  const { user } = useAuth();
  const cacheKey = user ? `${user.uid}:${listingId}` : "";
  const [isFav, setIsFav] = useState<boolean>(
    cacheKey ? favCache.get(cacheKey) ?? false : false
  );
  const [loading, setLoading] = useState<boolean>(
    cacheKey ? !favCache.has(cacheKey) : false
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // اشتراك في تحديثات نفس المفتاح من instances أخرى
  useEffect(() => {
    if (!cacheKey) return;
    let set = subscribers.get(cacheKey);
    if (!set) {
      set = new Set();
      subscribers.set(cacheKey, set);
    }
    const fn = (v: boolean) => {
      if (mountedRef.current) setIsFav(v);
    };
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0) subscribers.delete(cacheKey);
    };
  }, [cacheKey]);

  // تحميل أوّلي إذا لم يكن في الكاش
  useEffect(() => {
    if (!user || !listingId) {
      setIsFav(false);
      setLoading(false);
      return;
    }
    if (favCache.has(cacheKey)) {
      setIsFav(favCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "users", user.uid, "favorites", listingId))
      .then((snap) => {
        if (!mountedRef.current) return;
        const exists = snap.exists();
        favCache.set(cacheKey, exists);
        setIsFav(exists);
      })
      .catch(() => {
        if (mountedRef.current) setIsFav(false);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [user, listingId, cacheKey]);

  const toggle = useCallback(
    async (
      listing: Pick<Listing, "id" | "title" | "price" | "city" | "category" | "images">
    ) => {
      if (!user) throw new Error("يجب تسجيل الدخول لإضافة المفضلة.");
      const ref = doc(db, "users", user.uid, "favorites", listing.id);
      const willBeActive = !isFav;

      // optimistic update
      notifyKey(cacheKey, willBeActive);

      try {
        if (willBeActive) {
          await setDoc(ref, {
            listingId: listing.id,
            userId: user.uid,
            createdAt: serverTimestamp(),
            snapshot: {
              title: listing.title,
              price: Number(listing.price) || 0,
              city: listing.city,
              category: listing.category,
              image: listing.images?.[0] || "",
            },
          });
        } else {
          await deleteDoc(ref);
        }
      } catch (err) {
        // rollback
        notifyKey(cacheKey, !willBeActive);
        throw err;
      }
    },
    [user, isFav, cacheKey]
  );

  return { isFav, loading, toggle };
}
