"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing, TraderReview, UserProfile } from "@/lib/types";
import { inferListingEntityType } from "@/lib/utils";

interface TraderProfileState {
  profile: UserProfile | null;
  listings: Listing[];
  services: Listing[];
  reviews: TraderReview[];
  /** Live values derived from the reviews subcollection. */
  averageRating: number;
  reviewsCount: number;
  loading: boolean;
  missing: boolean;
  /** Set when the listings query fails (usually a missing composite index). */
  listingsError: string | null;
}

export function useTraderProfile(uid: string): TraderProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [traderItems, setTraderItems] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<TraderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let mounted = true;

    // Reset state when the uid changes so a previous trader's data
    // (or a stale `missing` flag) never leaks into the new profile.
    setProfile(null);
    setTraderItems([]);
    setReviews([]);
    setLoading(true);
    setMissing(false);
    setListingsError(null);

    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (!mounted) return;
        if (!snap.exists()) {
          setMissing(true);
          setLoading(false);
          return;
        }
        setProfile({ ...(snap.data() as UserProfile), uid: snap.id });
        setMissing(false);
        // The trader document is what gates the page. Once we have it,
        // stop the full-page skeleton; listings/reviews stream in after.
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setMissing(true);
        setLoading(false);
      });

    // Approved listings for this trader. Uses ownerId — the field actually
    // written by add-listing. Needs the composite index
    // (ownerId ASC, status ASC, createdAt DESC) from firestore.indexes.json.
    const listingsQuery = query(
      collection(db, "listings"),
      where("ownerId", "==", uid),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubListings = onSnapshot(
      listingsQuery,
      (snap) => {
        if (!mounted) return;
        const items = snap.docs.map((item) => ({
          ...(item.data() as Listing),
          id: item.id,
        }));
        setTraderItems(items);
        setListingsError(null);
        setLoading(false);
      },
      async (err) => {
        if (!mounted) return;
        // Most common cause: the composite index is not deployed yet.
        // Fall back to an unordered query so the tab still shows listings,
        // and record the error so the page can hint at deploying indexes.
        setListingsError(err?.message || "تعذّر تحميل إعلانات التاجر.");
        try {
          const fallback = await getDocs(
            query(
              collection(db, "listings"),
              where("ownerId", "==", uid),
              where("status", "==", "approved"),
              limit(50)
            )
          );
          if (!mounted) return;
          const items = fallback.docs
            .map((item) => ({ ...(item.data() as Listing), id: item.id }))
            .sort((a, b) => {
              const am = a.createdAt?.toMillis?.() ?? 0;
              const bm = b.createdAt?.toMillis?.() ?? 0;
              return bm - am;
            });
          setTraderItems(items);
        } catch {
          /* keep whatever we have */
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    // Reviews subcollection: users/{traderUid}/reviews/{reviewerUid}.
    const unsubReviews = onSnapshot(
      query(
        collection(db, "users", uid, "reviews"),
        orderBy("createdAt", "desc"),
        limit(100)
      ),
      (snap) => {
        if (!mounted) return;
        setReviews(
          snap.docs.map((item) => ({ ...(item.data() as TraderReview), id: item.id }))
        );
      },
      async () => {
        // The ordered query may fail if old reviews lack createdAt.
        // Fall back to an unordered read; reviews are non-critical.
        try {
          const fallback = await getDocs(collection(db, "users", uid, "reviews"));
          if (!mounted) return;
          setReviews(
            fallback.docs.map((item) => ({
              ...(item.data() as TraderReview),
              id: item.id,
            }))
          );
        } catch {
          /* ignore — never block the page on reviews */
        }
      }
    );

    return () => {
      mounted = false;
      unsubListings();
      unsubReviews();
    };
  }, [uid]);

  const listings = useMemo(
    () => traderItems.filter((item) => inferListingEntityType(item) === "listing"),
    [traderItems]
  );
  const services = useMemo(
    () => traderItems.filter((item) => inferListingEntityType(item) === "service"),
    [traderItems]
  );

  // averageRating / reviewsCount are derived live from the subcollection so
  // they are always correct even if the denormalised fields on the user
  // document drift. reviewsCount therefore only ever reflects real reviews.
  const reviewsCount = reviews.length;
  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  return {
    profile,
    listings,
    services,
    reviews,
    averageRating,
    reviewsCount,
    loading,
    missing,
    listingsError,
  };
}
