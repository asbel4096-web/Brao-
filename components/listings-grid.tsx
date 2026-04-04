'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ListingCard } from './listing-card';

export function ListingsGrid() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => onSnapshot(query(collection(db, 'listings')), (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((item: any) => ['approved', 'featured'].includes(item.status)).slice(0, 6);
    setItems(rows);
  }, console.error), []);

  return (
    <section className="container py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أحدث الإعلانات</h2>
          <p className="section-subtitle">بطاقات حديثة مرتبطة مباشرة بالإعلانات المعتمدة داخل Firebase.</p>
        </div>
        <Link href="/listings" className="text-sm font-bold text-brand-700">عرض كل الإعلانات</Link>
      </div>
      {items.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      ) : (
        <div className="card mt-6 p-6 text-center text-slate-500">لا توجد إعلانات معتمدة بعد.</div>
      )}
    </section>
  );
}
