"use client";

import { useMemo, useState } from "react";
import ListingCard from "@/components/listing-card";
import { Search, SlidersHorizontal, MapPin } from "lucide-react";

const allListings = [
  {
    id: "1",
    title: "مرسيدس E350",
    price: "65,000 د.ل",
    city: "طرابلس",
    year: "2014",
    condition: "مستعمل"
  },
  {
    id: "2",
    title: "كيا أوبتيما 2012",
    price: "28,700 د.ل",
    city: "مصراتة",
    year: "2012",
    condition: "مستعمل"
  },
  {
    id: "3",
    title: "هيونداي أزيرا 2012",
    price: "22,800 د.ل",
    city: "بنغازي",
    year: "2012",
    condition: "مستعمل"
  },
  {
    id: "4",
    title: "هونداي سنتافي 2014",
    price: "51,000 د.ل",
    city: "طرابلس",
    year: "2014",
    condition: "جديد"
  },
  {
    id: "5",
    title: "هيونداي سوناتا 2012",
    price: "9,999 د.ل",
    city: "الزاوية",
    year: "2012",
    condition: "مستعمل"
  },
  {
    id: "6",
    title: "تويوتا هايلوكس 1988",
    price: "40,000 د.ل",
    city: "سبها",
    year: "1988",
    condition: "مستعمل"
  },
  {
    id: "7",
    title: "قطع غيار هيونداي",
    price: "على السوم",
    city: "زليتن",
    condition: "متوفر"
  },
  {
    id: "8",
    title: "ميكانيكي متنقل",
    price: "حسب الخدمة",
    city: "طرابلس",
    condition: "خدمة"
  }
];

const cityOptions = ["الكل", "طرابلس", "بنغازي", "مصراتة", "الزاوية", "سبها", "زليتن"];
const conditionOptions = ["الكل", "جديد", "مستعمل", "خدمة", "متوفر"];

export default function ListingsPage() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("الكل");
  const [condition, setCondition] = useState("الكل");

  const filteredListings = useMemo(() => {
    return allListings.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.title.includes(search) ||
        item.city.includes(search) ||
        item.price.includes(search);

      const matchesCity = city === "الكل" || item.city === city;
      const matchesCondition =
        condition === "الكل" || item.condition === condition;

      return matchesSearch && matchesCity && matchesCondition;
    });
  }, [search, city, condition]);

  return (
    <section className="container pb-8">
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">
              الإعلانات
            </h1>

            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <SlidersHorizontal className="h-4 w-4" />
              فلترة
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="ابحث عن سيارة أو خدمة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-right text-base outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <MapPin className="h-5 w-5 text-slate-500" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-transparent text-right text-base outline-none"
              >
                {cityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-transparent text-right text-base outline-none"
              >
                {conditionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              النتائج
            </h2>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {filteredListings.length} إعلان
            </span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50 px-4 py-10 text-center text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              لا توجد نتائج مطابقة الآن.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price}
                  city={listing.city}
                  year={listing.year}
                  condition={listing.condition}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
