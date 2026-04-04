'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ADMIN_EMAILS } from '@/lib/constants';

export default function AdminListingsPage() {
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const isAdmin = useMemo(() => ADMIN_EMAILS.includes(email), [email]);

  useEffect(() => onAuthStateChanged(auth, (user) => setEmail(user?.email || '')), []);
  useEffect(() => onSnapshot(query(collection(db, 'listings')), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error), []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'listings', id), { status, featured: status === 'featured', updatedAt: serverTimestamp() });
  };

  if (!isAdmin) return <section className="container py-10"><div className="card p-8 text-center font-bold text-slate-700">هذه الصفحة للمشرف فقط. سجل الدخول بالحساب الإداري أولًا.</div></section>;

  return (
    <section className="container py-10">
      <h1 className="section-title">لوحة الموافقة على الإعلانات</h1>
      <p className="section-subtitle">إدارة بسيطة لاعتماد الإعلان أو رفضه أو جعله مميزًا.</p>
      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-4">الإعلان</th>
                <th className="px-4 py-4">القسم</th>
                <th className="px-4 py-4">المدينة</th>
                <th className="px-4 py-4">الحالة</th>
                <th className="px-4 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-4"><div className="font-bold text-slate-900">{item.title}</div><div className="text-xs text-slate-500">{item.ownerEmail || item.sellerName}</div></td>
                  <td className="px-4 py-4">{item.category}</td>
                  <td className="px-4 py-4">{item.city}</td>
                  <td className="px-4 py-4">{item.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateStatus(item.id, 'approved')} className="rounded-full bg-green-600 px-3 py-2 text-xs font-bold text-white">موافقة</button>
                      <button onClick={() => updateStatus(item.id, 'rejected')} className="rounded-full bg-red-600 px-3 py-2 text-xs font-bold text-white">رفض</button>
                      <button onClick={() => updateStatus(item.id, 'featured')} className="rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-amber-950">تمييز</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
