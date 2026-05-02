"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { ListingCard } from "./listing-card";

export function ListingsGrid() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => {
        setError(err.message || "تعذّر تحميل الإعلانات.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <section className="container py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أحدث الإعلانات</h2>
          <p className="section-subtitle">آخر الإعلانات المعتمدة على المنصة.</p>
        </div>
        <Link
          href="/listings"
          className="btn-ghost text-brand-700 dark:text-brand-300"
        >
          المزيد ←
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-80" />
          ))}
        </div>
      ) : error ? (
        <div className="card mt-6 border-rose-200 bg-rose-50 p-6 text-rose-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            لا توجد إعلانات حالياً. كن أوّل من يضيف إعلاناً!
          </p>
          <Link href="/add-listing" className="btn-action mt-4 inline-flex">
            أضف أول إعلان
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <ListingCard key={it.id} listing={it} />
          ))}
        </div>
      )}
    </section>
  );
}
