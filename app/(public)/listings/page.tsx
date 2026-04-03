"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LIBYA_CITIES } from "@/lib/libya-cities";

type Listing = {
  id: string;
  title: string;
  category: string;
  price: number | string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
  status: string;
  featured?: boolean;
  views?: number;
  createdAt?: Timestamp | null;
  images?: string[];
  whatsapp?: string;
  year?: number | null;
  mileage?: number | null;
  fuel?: string;
  transmission?: string;
};

const fallbackImage = "/icons/car-card.svg";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("كل الأقسام");
  const [city, setCity] = useState("كل المدن");

  useEffect(() => {
    const listingsRef = collection(db, "listings");
    const listingsQuery = query(listingsRef);

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const items: Listing[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Listing, "id">)
        }));

        items.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() || 0;
          const bMs = b.createdAt?.toMillis?.() || 0;
          return bMs - aMs;
        });

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
      if (item.status !== "approved") return false;

      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.description?.toLowerCase().includes(normalizedSearch) ||
        item.sellerName?.toLowerCase().includes(normalizedSearch);

      const matchesCategory = category === "كل الأقسام" || item.category === category;
      const matchesCity = city === "كل المدن" || item.city === city;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [listings, search, category, city]);

  return (
    <section className="container py-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="card w-full p-5 lg:w-[320px] lg:self-start">
          <h2 className="text-xl font-black">فلترة الإعلانات</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">ابحث</label>
              <input
                className="input"
                placeholder="ابحث عن سيارة، قطع غيار..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="label">القسم</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>كل الأقسام</option>
                <option>سيارات</option>
                <option>قطع غيار</option>
                <option>كماليات</option>
                <option>خدمات</option>
              </select>
            </div>

            <div>
              <label className="label">المدينة</label>
              <select
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option>كل المدن</option>
                {LIBYA_CITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={() => {
                setSearch("");
                setCategory("كل الأقسام");
                setCity("كل المدن");
              }}
            >
              إعادة التصفية
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="section-title">الإعلانات</h1>
              <p className="section-subtitle">عرض مباشر للإعلانات المحفوظة في Firebase Firestore.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              عدد النتائج: <span className="font-bold">{filteredListings.length}</span>
            </div>
          </div>

          {loading ? <div className="card p-6 text-center text-slate-500">جارٍ تحميل الإعلانات...</div> : null}

          {errorMessage ? (
            <div className="card border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
          ) : null}

          {!loading && !errorMessage && filteredListings.length === 0 ? (
            <div className="card p-6 text-center text-slate-500">لا توجد إعلانات مطابقة حاليًا.</div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                <div className="h-52 overflow-hidden bg-slate-100">
                  <img
                    src={item.images?.[0] || fallbackImage}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <span className="badge">{item.category || "إعلان"}</span>
                      <h3 className="mt-3 line-clamp-2 text-lg font-black text-slate-900">{item.title}</h3>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      معتمد
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.year ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.year}</span> : null}
                    {item.mileage ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.mileage.toLocaleString("ar-LY")} كم</span> : null}
                    {item.fuel ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.fuel}</span> : null}
                    {item.transmission ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.transmission}</span> : null}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p><span className="font-bold text-slate-800">المدينة:</span> {item.city || "-"}</p>
                    <p><span className="font-bold text-slate-800">السعر:</span> {item.price || "-"}</p>
                    <p><span className="font-bold text-slate-800">البائع:</span> {item.sellerName || "-"}</p>
                    <p><span className="font-bold text-slate-800">الهاتف:</span> {item.phone || "-"}</p>
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">{item.description || "لا يوجد وصف."}</p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Link href={`/listings/${item.id}`} className="btn btn-secondary px-3 py-2 text-xs">التفاصيل</Link>
                    <a href={`tel:${item.phone}`} className="btn btn-secondary px-3 py-2 text-xs">اتصال</a>
                    <a href={`https://wa.me/${item.whatsapp || item.phone}`} className="btn btn-primary px-3 py-2 text-xs">واتساب</a>
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
