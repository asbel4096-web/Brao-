'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LIBYAN_CITIES } from '@/lib/constants';

export default function EditListingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'listings', params.id)).then((snap) => {
      setForm(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
  }, [params.id]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    await updateDoc(doc(db, 'listings', params.id), { ...form, updatedAt: serverTimestamp(), status: 'pending' });
    router.push('/my-listings');
  };

  if (loading) return <section className="container py-10"><div className="card p-6 text-center">جارٍ التحميل...</div></section>;
  if (!form) return <section className="container py-10"><div className="card p-6 text-center">الإعلان غير موجود.</div></section>;

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl card p-6">
        <h1 className="section-title">تعديل الإعلان</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <select className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })}>{LIBYAN_CITIES.map((city) => <option key={city}>{city}</option>)}</select>
          <input className="input" value={form.sellerPhone || form.phone || ''} onChange={(e) => setForm({ ...form, sellerPhone: e.target.value, phone: e.target.value })} />
        </div>
        <textarea className="input mt-4 min-h-[160px]" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="mt-5 flex gap-3">
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ وإرسال للمراجعة'}</button>
          <button onClick={() => router.push('/my-listings')} className="btn-secondary">رجوع</button>
        </div>
      </div>
    </section>
  );
}
