"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ListingCard } from "./listing-card";
import { Listing } from "@/lib/types";

const fallbackListing: Listing[] = [];

export function ListingsGrid() {
  const [listings, setListings] = useState<Listing[]>(fallbackListing);

  useEffect(() => {
    const listingsQuery = query(collection(db, "listings"), limit(6));
    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            title: doc.data().title || "إعلان",
            category:
              doc.data().category === "سيارات"
                ? "cars"
                : doc.data().category === "قطع غيار"
                ? "parts"
                : doc.data().category === "كماليات"
                ? "accessories"
                : "services",
            city: doc.data().city || "-",
            price: Number(doc.data().price || 0),
            year: doc.data().year || undefined,
            mileage: doc.data().mileage || undefined,
            fuel: doc.data().fuel || undefined,
            transmission: doc.data().transmission || undefined,
            description: doc.data().description || "",
            images: doc.data().images?.length ? doc.data().images : ["/icons/car-card.svg"],
            sellerName: doc.data().sellerName || "مستخدم براتشو كار",
            sellerPhone: doc.data().phone || "",
            whatsapp: doc.data().whatsapp || doc.data().phone || "",
            createdAt: new Date().toISOString(),
            status: doc.data().status || "approved",
            featured: Boolean(doc.data().featured)
          }))
          .filter((item) => item.status === "approved") as Listing[];

        setListings(items);
      },
      (error) => {
        console.error("Homepage listings load error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  if (!listings.length) return null;

  return (
    <section className="container py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أحدث الإعلانات</h2>
          <p className="section-subtitle">إعلانات مضافة فعليًا من المستخدمين ومخزنة داخل Firebase.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
