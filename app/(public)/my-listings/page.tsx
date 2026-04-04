'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { formatPrice } from '@/lib/utils';

export default function MyListingsPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (user) => { setUserId(user?.uid || ''); setLoading(false); }), []);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'listings'), where('ownerId', '==', userId));
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error);
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف الإعلان؟')) return;
    await deleteDoc(doc(db, 'listings', id));
  };

  if (loading) return <section className="container py-10"><div className="card p-6 text-center">جارٍ التحميل...</div></section>;
  if (!userId) return <section className="container py-10"><div className="card p-6 text-center">سجل الدخول أولًا لعرض إعلاناتك.</div></section>;

  return (
    <section className="container py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="section-title">إعلاناتي</h1>
          <p className="section-subtitle">إدارة كاملة لإعلاناتك: عرض، تعديل، حذف، ومتابعة حالة الاعتماد.</p>
        </div>
        <Link href="/add-listing" className="btn-primary">إضافة إعلان جديد</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden p-4">
            <img src={item.images?.[0] || '/icons/car-card.svg'} alt={item.title} className="h-48 w-full rounded-[22px] object-cover" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">{item.title}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
            </div>
            <div className="mt-2 text-sm text-slate-500">{item.city}</div>
            <div className="mt-2 font-black text-brand-700">{formatPrice(item.price)}</div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Link href={`/listings/${item.id}`} className="btn-secondary px-3 py-2 text-xs">عرض</Link>
              <Link href={`/my-listings/${item.id}/edit`} className="btn-secondary px-3 py-2 text-xs">تعديل</Link>
              <button onClick={() => handleDelete(item.id)} className="rounded-[18px] bg-red-600 px-3 py-2 text-xs font-bold text-white">حذف</button>
            </div>
          </div>
        ))}
      </div>
      {!items.length ? <div className="card mt-6 p-6 text-center text-slate-500">لا توجد لديك إعلانات بعد.</div> : null}
    </section>
  );
}
