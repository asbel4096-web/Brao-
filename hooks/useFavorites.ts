"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Favorite, Listing } from "@/lib/types";

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
