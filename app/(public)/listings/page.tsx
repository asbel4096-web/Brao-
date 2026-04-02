"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("كل الأقسام");
  const [city, setCity] = useState("كل المدن");

  useEffect(() => {
    const listingsRef = collection(db, "listings");
    const listingsQuery = query(
      listingsRef,
      where("status", "in", ["approved", "pending"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const items: Listing[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Listing, "id">)
        }));

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
      const matchesSearch =
        !search.trim() ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.sellerName?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "كل الأقسام" || item.category === category;

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
                <option>طرابلس</option>
                <option>بنغازي</option>
                <option>مصراتة</option>
                <option>الزاوية</option>
                <option>زليتن</option>
                <option>سبها</option>
                <option>الخمس</option>
                <option>سرت</option>
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
              <p className="section-subtitle">
                عرض مباشر للإعلانات المحفوظة في Firebase Firestore.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              عدد النتائج: <span className="font-bold">{filteredListings.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="card p-6 text-center text-slate-500">
              جارٍ تحميل الإعلانات...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="card border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && filteredListings.length === 0 ? (
            <div className="card p-6 text-center text-slate-500">
              لا توجد إعلانات مطابقة حاليًا.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <article key={item.id} className="card overflow-hidden p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="badge">{item.category || "إعلان"}</span>
                    <h3 className="mt-3 line-clamp-2 text-lg font-black text-slate-900">
                      {item.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status === "approved" ? "معتمد" : "بانتظار الاعتماد"}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-bold text-slate-800">المدينة:</span>{" "}
                    {item.city || "-"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">السعر:</span>{" "}
                    {item.price || "-"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">البائع:</span>{" "}
                    {item.sellerName || "-"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">الهاتف:</span>{" "}
                    {item.phone || "-"}
                  </p>
                </div>

                <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                  {item.description || "لا يوجد وصف."}
                </p>

                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/listings/${item.id}`}
                    className="btn btn-primary flex-1 text-center"
                  >
                    التفاصيل
                  </Link>

                  <a
                    href={`tel:${item.phone || ""}`}
                    className="btn btn-secondary flex-1 text-center"
                  >
                    اتصال
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
