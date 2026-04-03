"use client";

import { FormEvent, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { libyaCities, listingCategories } from '@/lib/categories';

export default function EditListingPage({ params }: { params: { id: string } }) {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<any>({ title: '', category: 'سيارات', city: 'طرابلس', price: '', description: '', sellerPhone: '', sellerName: '' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid || ''));
    return () => unsub();
  }, []);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'listings', params.id));
      if (snap.exists()) {
        setForm({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    };
    load();
  }, [params.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid || form.ownerId !== uid) {
      setMessage('غير مسموح بتعديل هذا الإعلان.');
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, 'listings', params.id), {
      title: form.title,
      category: form.category,
      city: form.city,
      price: Number(form.price) || 0,
      description: form.description,
      sellerPhone: form.sellerPhone,
      sellerName: form.sellerName,
      updatedAt: serverTimestamp(),
      status: 'pending'
    });
    setSaving(false);
    setMessage('تم تحديث الإعلان وإرساله للمراجعة من جديد.');
  };

  if (loading) return <section className="container py-10"><div className="card p-6 text-center">جارٍ تحميل الإعلان...</div></section>;

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-3xl card p-6">
        <h1 className="section-title">تعديل الإعلان</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">العنوان</label>
            <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>{listingCategories.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <div>
              <label className="label">المدينة</label>
              <select className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })}>{libyaCities.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label">السعر</label><input className="input" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="label">الهاتف</label><input className="input" value={form.sellerPhone || ''} onChange={(e) => setForm({ ...form, sellerPhone: e.target.value })} /></div>
          </div>
          <div><label className="label">اسم البائع</label><input className="input" value={form.sellerName || ''} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} /></div>
          <div><label className="label">الوصف</label><textarea className="input min-h-[140px]" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {message ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div> : null}
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
        </form>
      </div>
    </section>
  );
}
