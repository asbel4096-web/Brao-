"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAILS = ['asbel4096@gmail.com'];

export default function AdminListingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setEmail(user?.email || ''));
    const unsubData = onSnapshot(query(collection(db, 'listings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubAuth();
      unsubData();
    };
  }, []);

  const isAdmin = ADMIN_EMAILS.includes(email);

  const setStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'listings', id), { status });
    setMessage(`تم تحديث الإعلان إلى ${status}.`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الإعلان؟')) return;
    await deleteDoc(doc(db, 'listings', id));
    setMessage('تم حذف الإعلان.');
  };

  if (!isAdmin) {
    return <section className="container py-10"><div className="card p-6 text-center">هذه الصفحة للمشرف فقط. سجّل الدخول بالحساب الإداري أولًا.</div></section>;
  }

  return (
    <section className="container py-10">
      <div className="mb-6">
        <h1 className="section-title">مراجعة واعتماد الإعلانات</h1>
        <p className="section-subtitle">اعتمد أو ارفض أو احذف الإعلانات من لوحة بسيطة وسريعة.</p>
      </div>
      {message ? <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div> : null}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-black dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{item.city} • {item.category} • {item.sellerName}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">الحالة الحالية: {item.status || 'pending'}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={() => setStatus(item.id, 'approved')}>اعتماد</button>
                <button className="btn-secondary border-amber-300 text-amber-700" onClick={() => setStatus(item.id, 'rejected')}>رفض</button>
                <button className="btn-secondary border-red-300 text-red-700" onClick={() => handleDelete(item.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
