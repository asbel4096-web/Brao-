'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CATEGORY_OPTIONS, LIBYAN_CITIES } from '@/lib/constants';
import { formatPrice, whatsappLink } from '@/lib/utils';
import Link from 'next/link';

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'كل الأقسام');
  const [city, setCity] = useState('كل المدن');

  useEffect(() => onSnapshot(query(collection(db, 'listings')), (snap) => {
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, () => setLoading(false)), []);

  const filtered = useMemo(() => items.filter((item) => {
    if (!['approved', 'featured'].includes(item.status)) return false;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || String(item.title || '').toLowerCase().includes(q) || String(item.description || '').toLowerCase().includes(q);
    const matchesCategory = category === 'كل الأقسام' || item.category === category;
    const matchesCity = city === 'كل المدن' || item.city === city;
    return matchesSearch && matchesCategory && matchesCity;
  }), [items, search, category, city]);

  return (
    <section className="container py-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="card w-full p-5 lg:w-[320px] lg:self-start">
          <h2 className="text-xl font-black">فلترة الإعلانات</h2>
          <div className="mt-5 space-y-4">
            <div><label className="label">ابحث</label><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن سيارة أو خدمة..." /></div>
            <div><label className="label">القسم</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option>كل الأقسام</option>{CATEGORY_OPTIONS.map((opt) => <option key={opt.key}>{opt.label}</option>)}</select></div>
            <div><label className="label">المدينة</label><select className="input" value={city} onChange={(e) => setCity(e.target.value)}><option>كل المدن</option>{LIBYAN_CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <button className="btn-secondary w-full" onClick={() => { setSearch(''); setCategory('كل الأقسام'); setCity('كل المدن'); }}>إعادة التصفية</button>
          </div>
        </aside>
        <div className="flex-1">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="section-title">الإعلانات</h1>
              <p className="section-subtitle">عرض مباشر للإعلانات المعتمدة مع بطاقات أنيقة وصور حقيقية من Firebase.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">عدد النتائج: <span className="font-bold">{filtered.length}</span></div>
          </div>
          {loading ? <div className="card p-6 text-center text-slate-500">جارٍ تحميل الإعلانات...</div> : null}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                <img src={item.images?.[0] || '/icons/car-card.svg'} alt={item.title} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="badge">{item.category}</span>
                      <h3 className="mt-3 line-clamp-2 text-lg font-black text-slate-900">{item.title}</h3>
                    </div>
                    <div className="text-lg font-black text-brand-700">{formatPrice(item.price)}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-500">{item.city}</div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.year ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.year}</span> : null}
                    {item.mileage ? <span className="rounded-full bg-slate-100 px-3 py-1">{Number(item.mileage).toLocaleString('ar-LY')} كم</span> : null}
                    {item.fuel ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.fuel}</span> : null}
                    {item.transmission ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.transmission}</span> : null}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Link href={`/listings/${item.id}`} className="btn-secondary px-3 py-2 text-xs">التفاصيل</Link>
                    <a href={`tel:${item.sellerPhone || item.phone || ''}`} className="btn-secondary px-3 py-2 text-xs">اتصال</a>
                    <a href={whatsappLink(item.whatsapp || item.sellerPhone || item.phone || '')} target="_blank" className="btn-primary px-3 py-2 text-xs">واتساب</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && !filtered.length ? <div className="card mt-6 p-6 text-center text-slate-500">لا توجد إعلانات مطابقة حاليًا.</div> : null}
        </div>
      </div>
    </section>
  );
}
