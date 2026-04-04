'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { formatPrice, whatsappLink } from '@/lib/utils';

export default function ListingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'listings', params.id)).then((snap) => {
      setListing(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <section className="container py-10"><div className="card p-6 text-center text-slate-500">جارٍ تحميل التفاصيل...</div></section>;
  if (!listing) return <section className="container py-10"><div className="card p-6 text-center text-slate-500">الإعلان غير موجود. <button onClick={() => router.push('/listings')} className="mr-2 font-bold text-brand-700">رجوع</button></div></section>;

  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {(listing.images?.length ? listing.images : ['/icons/car-card.svg']).map((image: string) => (
                <img key={image} src={image} alt={listing.title} className="h-64 w-full rounded-[24px] object-cover" />
              ))}
            </div>
            <div className="p-6">
              <div className="badge">{listing.category}</div>
              <h1 className="mt-4 text-3xl font-black text-slate-950">{listing.title}</h1>
              <div className="mt-4 grid gap-3 rounded-[28px] bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <div><strong>السنة:</strong> {listing.year ?? '-'}</div>
                <div><strong>العداد:</strong> {listing.mileage ? `${Number(listing.mileage).toLocaleString('ar-LY')} كم` : '-'}</div>
                <div><strong>الوقود:</strong> {listing.fuel ?? '-'}</div>
                <div><strong>الناقل:</strong> {listing.transmission ?? '-'}</div>
              </div>
              <p className="mt-6 text-base leading-8 text-slate-600">{listing.description}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="text-sm text-slate-500">السعر</div>
            <div className="mt-2 text-4xl font-black text-brand-700">{formatPrice(listing.price)}</div>
            <div className="mt-6 grid gap-3">
              <a href={`tel:${listing.sellerPhone || listing.phone || ''}`} className="btn-secondary gap-2"><Phone size={18} />اتصال مباشر</a>
              <a href={whatsappLink(listing.whatsapp || listing.sellerPhone || listing.phone || '')} target="_blank" className="btn-primary gap-2"><MessageCircle size={18} />واتساب</a>
              <Link href="/messages" className="btn-secondary">فتح الدردشة</Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-brand-700"><ShieldCheck size={18} /><span className="font-black">المعلن</span></div>
            <div className="mt-4 text-lg font-black text-slate-950">{listing.sellerName}</div>
            <div className="mt-2 text-sm text-slate-500">{listing.city}</div>
            <div className="mt-4 text-sm leading-7 text-slate-600">حالة الإعلان: {listing.status === 'approved' ? 'معتمد' : listing.status === 'featured' ? 'مميز' : listing.status}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
