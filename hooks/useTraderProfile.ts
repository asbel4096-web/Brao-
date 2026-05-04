"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
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
  loading: boolean;
  missing: boolean;
}

export function useTraderProfile(uid: string): TraderProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [traderItems, setTraderItems] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<TraderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!uid) return;

    let mounted = true;

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
      })
      .catch(() => {
        if (!mounted) return;
        setMissing(true);
        setLoading(false);
      });

    const listingsQuery = query(
      collection(db, "listings"),
      where("ownerId", "==", uid),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const reviewsQuery = query(
      collection(db, "users", uid, "reviews"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubListings = onSnapshot(
      listingsQuery,
      (snap) => {
        const items = snap.docs.map((item) => ({ ...(item.data() as Listing), id: item.id }));
        setTraderItems(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubReviews = onSnapshot(reviewsQuery, (snap) => {
      setReviews(snap.docs.map((item) => ({ ...(item.data() as TraderReview), id: item.id })));
    });

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

  return { profile, listings, services, reviews, loading, missing };
}
