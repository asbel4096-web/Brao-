"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Listing = {
  id: string;
  title: string;
  category: string;
  price: string;
  city: string;
  description?: string;
  phone?: string;
  year?: string;
  mileage?: string;
  fuelType?: string;
  transmission?: string;
  images?: string[];
};

const CATEGORY_OPTIONS = [
  "كل الأقسام",
  "سيارات",
  "حافلات",
  "شاحنات",
  "خدمات",
  "كماليات سيارات",
  "زيوت ومواد مضافة",
  "ميكانيكي متنقل",
  "إطارات وجنوط",
  "قطع غيار سيارات وشاحنات",
  "قطع غيار كهربائية",
  "سمكرة وزواق",
  "ورش ميكانيكا",
  "فني كهربائي سيارات",
  "سيارات بها حوادث",
  "قطع غيار مستعملة"
] as const;

const LIBYA_CITIES = [
  "كل المدن",
  "طرابلس",
  "بنغازي",
  "مصراتة",
  "الزاوية",
  "زليتن",
  "صبراتة",
  "صرمان",
  "جنزور",
  "الخمس",
  "ترهونة",
  "غريان",
  "يفرن",
  "نالوت",
  "زوارة",
  "رقدالين",
  "العجيلات",
  "سرت",
  "إجدابيا",
  "المرج",
  "البيضاء",
  "درنة",
  "طبرق",
  "سبها",
  "أوباري",
  "مرزق",
  "غات",
  "الكفرة",
  "هون",
  "ودان",
  "براك الشاطئ",
  "بن وليد",
  "شحات",
  "راس لانوف"
] as const;

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("كل الأقسام");
  const [city, setCity] = useState("كل المدن");

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Listing, "id">)
        }));
        setListings(rows);
        setLoading(false);
      },
      (error) => {
        console.error("Listings load error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredListings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return listings.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.title?.toLowerCase().includes(keyword) ||
        item.city?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword);

      const matchesCategory =
        category === "كل الأقسام" || item.category === category;

      const matchesCity =
        city === "كل المدن" || item.city === city;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [listings, search, category, city]);

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">الإعلانات</h1>
          <p className="mt-2 text-slate-500">تصفّح أحدث الإعلانات في براتشو كار</p>
        </div>

        <div className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">بحث</label>
            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سيارة أو مدينة أو قسم"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">القسم</label>
            <select
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">المدينة</label>
            <select
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {LIBYA_CITIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"
            onClick={() => {
              setSearch("");
              setCategory("كل الأقسام");
              setCity("كل المدن");
            }}
          >
            مسح الفلاتر
          </button>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            جارٍ تحميل الإعلانات...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            لا توجد إعلانات مطابقة حاليًا.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => {
              const image = item.images?.[0] || "/placeholder-car.jpg";

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={image}
                    alt={item.title}
                    className="h-60 w-full object-cover"
                  />

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">{item.title}</h2>
                        <p className="mt-1 text-slate-500">{item.city}</p>
                      </div>

                      <div className="text-left text-2xl font-black text-blue-700">
                        {item.price}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {item.year && <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{item.year}</span>}
                      {item.mileage && <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{item.mileage}</span>}
                      {item.fuelType && <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{item.fuelType}</span>}
                      {item.transmission && <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{item.transmission}</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <a
                        href={item.phone ? `https://wa.me/${item.phone.replace(/\D/g, "")}` : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-bold text-white"
                      >
                        واتساب
                      </a>

                      <a
                        href={item.phone ? `tel:${item.phone}` : "#"}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-800"
                      >
                        اتصال
                      </a>

                      <Link
                        href={`/listings/${item.id}`}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-800"
                      >
                        التفاصيل
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
