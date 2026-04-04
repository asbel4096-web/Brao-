"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { formatPrice } from '@/lib/utils';

export default function MyListingsPage() {
  const [uid, setUid] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid || ''));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(query(collection(db, 'listings'), where('ownerId', '==', uid)), (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [uid]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف الإعلان؟')) return;
    await deleteDoc(doc(db, 'listings', id));
    setMessage('تم حذف الإعلان.');
  };

  if (!uid) return <section className="container py-10"><div className="card p-6 text-center">سجل الدخول أولًا لعرض إعلاناتك.</div></section>;

  return (
    <section className="container py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="section-title">إعلاناتي</h1>
          <p className="section-subtitle">إدارة إعلاناتك، تعديلها، حذفها، ومتابعة حالة الموافقة.</p>
        </div>
        <Link href="/add-listing" className="btn-primary">إضافة إعلان جديد</Link>
      </div>
      {message ? <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden p-0">
            <img src={item.images?.[0] || '/icons/car-card.svg'} alt={item.title} className="h-52 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black dark:text-white">{item.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status === 'approved' ? 'معتمد' : item.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{item.city} • {item.category}</p>
              <div className="mt-4 text-xl font-black text-brand-700">{formatPrice(Number(item.price) || 0)}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link href={`/my-listings/${item.id}/edit`} className="btn-secondary">تعديل</Link>
                <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => handleDelete(item.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!items.length ? <div className="card mt-4 p-6 text-center">لا توجد إعلانات مضافة من هذا الحساب حتى الآن.</div> : null}
    </section>
  );
}
