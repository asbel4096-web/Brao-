"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { libyaCities, listingCategories } from "@/lib/categories";
import { formatPrice } from "@/lib/utils";

type Listing = {
  id: string;
  title: string;
  category: string;
  price: number;
  city: string;
  description: string;
  sellerPhone: string;
  sellerName: string;
  status: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  images?: string[];
  address?: string;
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("كل الأقسام");
  const [city, setCity] = useState("كل المدن");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "listings")),
      (snapshot) => {
        const items: Listing[] = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Listing, "id">) }));
        setListings(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading listings:", error);
        setErrorMessage("حدث خطأ أثناء تحميل الإعلانات.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.status !== "approved" && item.status !== "featured") return false;
      const text = `${item.title || ""} ${item.description || ""} ${item.sellerName || ""}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
      const matchesCategory = category === "كل الأقسام" || item.category === category;
      const matchesCity = city === "كل المدن" || item.city === city;
      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [listings, search, category, city]);

  return (
    <section className="container py-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="card w-full p-5 lg:w-[320px] lg:self-start">
          <h2 className="text-xl font-black dark:text-white">فلترة الإعلانات</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">ابحث</label>
              <input className="input" placeholder="ابحث عن سيارة أو ورشة أو قطع" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>كل الأقسام</option>
                {listingCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المدينة</label>
              <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
                <option>كل المدن</option>
                {libyaCities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <button className="btn btn-primary w-full" onClick={() => { setSearch(""); setCategory("كل الأقسام"); setCity("كل المدن"); }}>
              إعادة التصفية
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="section-title">الإعلانات</h1>
              <p className="section-subtitle">سوق مرتب للمركبات والورش والخدمات وقطع الغيار داخل ليبيا.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              عدد النتائج: <span className="font-bold">{filteredListings.length}</span>
            </div>
          </div>

          {loading ? <div className="card p-6 text-center text-slate-500">جارٍ تحميل الإعلانات...</div> : null}
          {errorMessage ? <div className="card border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div> : null}
          {!loading && !errorMessage && filteredListings.length === 0 ? <div className="card p-6 text-center text-slate-500">لا توجد إعلانات مطابقة حاليًا.</div> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <article key={item.id} className="card overflow-hidden p-0">
                <img src={item.images?.[0] || "/icons/car-card.svg"} alt={item.title} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="badge">{item.category || "إعلان"}</span>
                    <span className="text-lg font-black text-brand-700">{formatPrice(Number(item.price) || 0)}</span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
                    {item.year ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{item.year}</span> : null}
                    {item.mileage ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{item.mileage.toLocaleString("ar-LY")} كم</span> : null}
                    {item.fuel ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{item.fuel}</span> : null}
                    {item.transmission ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{item.transmission}</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{item.city}{item.address ? ` • ${item.address}` : ""}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description || "لا يوجد وصف."}</p>
                  <div className="mt-5 flex gap-3">
                    <Link href={`/listings/${item.id}`} className="btn btn-primary flex-1 text-center">التفاصيل</Link>
                    <a href={`tel:${item.sellerPhone || ""}`} className="btn btn-secondary flex-1 text-center">اتصال</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
