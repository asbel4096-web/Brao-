"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { featuredListings } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils';

export default function ListingDetailsPage({ params }: { params: { id: string } }) {
  const [listing, setListing] = useState<any>(featuredListings.find((item) => item.id === params.id) || null);
  const [loading, setLoading] = useState(!listing);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'listings', params.id));
        if (snap.exists()) {
          setListing({ id: snap.id, ...snap.data() });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading) return <section className="container py-10"><div className="card p-6 text-center">جارٍ تحميل التفاصيل...</div></section>;
  if (!listing) return <section className="container py-10"><div className="card p-6 text-center">الإعلان غير موجود.</div></section>;

  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="h-[340px] bg-gradient-to-br from-brand-100 to-slate-100">
              <img src={listing.images?.[0] || '/icons/car-card.svg'} alt={listing.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="badge">{listing.category}</div>
              <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{listing.title}</h1>
              <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                <div><strong>السنة:</strong> {listing.year ?? '-'}</div>
                <div><strong>العداد:</strong> {listing.mileage ? `${Number(listing.mileage).toLocaleString('ar-LY')} كم` : '-'}</div>
                <div><strong>الوقود:</strong> {listing.fuel ?? '-'}</div>
                <div><strong>الناقل:</strong> {listing.transmission ?? '-'}</div>
              </div>
              <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-200">{listing.description}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="text-sm text-slate-500 dark:text-slate-300">السعر</div>
            <div className="mt-2 text-4xl font-black text-brand-700">{formatPrice(Number(listing.price) || 0)}</div>
            <div className="mt-6 grid gap-3">
              <a href={`tel:${listing.sellerPhone || listing.phone || ''}`} className="btn-secondary gap-2"><Phone size={18} />اتصال مباشر</a>
              <a href={`https://wa.me/${listing.whatsapp || listing.sellerPhone || listing.phone || ''}`} className="btn-primary gap-2"><MessageCircle size={18} />واتساب</a>
              <Link href="/messages" className="btn-secondary">فتح الدردشة</Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-brand-700"><ShieldCheck size={18} /><span className="font-black">البائع</span></div>
            <div className="mt-4 text-lg font-black text-slate-950 dark:text-white">{listing.sellerName}</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{listing.city}</div>
            {listing.address ? <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{listing.address}</div> : null}
            {listing.mapLink ? <a href={listing.mapLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700"><MapPin size={16} />فتح الموقع على الخريطة</a> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
