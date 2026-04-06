"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Fuel,
  Gauge,
  MapPin,
  Phone,
  Share2,
  Heart,
  CarFront,
  ChevronLeft
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import StartChatButton from "@/components/StartChatButton";

type ListingData = {
  id: string;
  title: string;
  price: string;
  year?: string;
  mileage?: string;
  fuelType?: string;
  city?: string;
  spec?: string;
  phone?: string;
  locationLabel?: string;
  address?: string;
  description?: string;
  images?: string[];
  ownerId?: string;
  sellerName?: string;
};

type SimilarListing = {
  id: string;
  title: string;
  price: string;
  city?: string;
};

const quickQuestions = ["أنا مهتم", "قداش نهايتها", "وين مكانك", "في توصيل"];

export default function ListingDetailsPage() {
  const params = useParams();
  const listingId = String(params?.id || "");

  const [listing, setListing] = useState<ListingData | null>(null);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mainImage = useMemo(() => {
    return listing?.images?.[0] || "";
  }, [listing]);

  useEffect(() => {
    if (!listingId) return;

    const loadListing = async () => {
      try {
        setLoading(true);
        setError("");

        const listingRef = doc(db, "listings", listingId);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
          setError("الإعلان غير موجود.");
          setListing(null);
          setLoading(false);
          return;
        }

        const data = listingSnap.data();

        const currentListing: ListingData = {
          id: listingSnap.id,
          title: data.title || "إعلان بدون عنوان",
          price: data.price || "على السوم",
          year: data.year || "",
          mileage: data.mileage || "",
          fuelType: data.fuelType || data.fuel || "",
          city: data.city || "",
          spec: data.spec || "",
          phone: data.phone || data.ownerPhone || "",
          locationLabel: data.locationLabel || data.address || "",
          address: data.address || "",
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images : [],
          ownerId: data.ownerId || "",
          sellerName: data.sellerName || "المعلن"
        };

        setListing(currentListing);

        if (currentListing.city) {
          const similarQuery = query(
            collection(db, "listings"),
            where("city", "==", currentListing.city),
            limit(6)
          );

          const similarSnap = await getDocs(similarQuery);

          const similarRows: SimilarListing[] = similarSnap.docs
            .filter((d) => d.id !== listingId)
            .map((d) => {
              const row = d.data();
              return {
                id: d.id,
                title: row.title || "إعلان",
                price: row.price || "على السوم",
                city: row.city || ""
              };
            });

          setSimilarListings(similarRows.slice(0, 4));
        } else {
          setSimilarListings([]);
        }
      } catch (err) {
        console.error("Listing details error:", err);
        setError("حدث خطأ أثناء تحميل الإعلان.");
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [listingId]);

  if (loading) {
    return (
      <section className="container pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          جارٍ تحميل الإعلان...
        </div>
      </section>
    );
  }

  if (error || !listing) {
    return (
      <section className="container pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {error || "تعذر تحميل الإعلان."}
        </div>
      </section>
    );
  }

  return (
    <section className="container pb-10">
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative h-[320px] overflow-hidden bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
            {mainImage ? (
              <img
                src={mainImage}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : null}

            <div className="absolute left-4 top-4 flex gap-2">
              <button className="rounded-2xl bg-white/90 p-3 text-slate-900 shadow">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="rounded-2xl bg-white/90 p-3 text-rose-500 shadow">
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute bottom-4 right-4 rounded-2xl bg-black/80 px-4 py-2 text-lg font-black text-white">
              {listing.price}
            </div>
          </div>

          <div className="p-5 text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {listing.spec || "إعلان سيارة"}
                </div>
                <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                  {listing.title}
                </h1>
              </div>

              <button className="rounded-2xl border border-slate-200 p-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm">السنة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.year || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">المسافة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.mileage || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <Fuel className="h-4 w-4" />
                  <span className="text-sm">الوقود</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.fuelType || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">المدينة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.city || "-"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <a
                href={`tel:${listing.phone || ""}`}
                className="flex items-center justify-center gap-3 rounded-[22px] bg-blue-600 px-6 py-4 text-xl font-black text-white shadow-sm"
              >
                <Phone className="h-5 w-5" />
                {listing.phone || "رقم غير متوفر"}
              </a>

              <StartChatButton
                listingId={listing.id}
                listingTitle={listing.title}
                sellerId={listing.ownerId || ""}
                sellerName={listing.sellerName || "المعلن"}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            وصف الإعلان
          </h2>
          <p className="mt-4 text-lg leading-9 text-slate-600 dark:text-slate-300">
            {listing.description || "لا يوجد وصف لهذا الإعلان."}
          </p>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <h2 className="text-3xl font-black text-slate-950 dark:text-white">
                الموقع
              </h2>
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-300">
                {listing.locationLabel || listing.address || "الموقع غير محدد"}
              </p>
            </div>

            <MapPin className="h-7 w-7 text-slate-700 dark:text-slate-200" />
          </div>

          <div className="mt-4 flex h-40 items-center justify-center rounded-[24px] bg-slate-100 text-xl font-black text-blue-600 dark:bg-slate-800">
            عرض على الخريطة
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            اسأل المعلن
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            {quickQuestions.map((q) => (
              <button
                key={q}
                className="rounded-full bg-blue-50 px-5 py-3 text-base font-extrabold text-blue-700 dark:bg-slate-800 dark:text-blue-300"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <textarea
              placeholder="رسالة نصية..."
              className="min-h-[120px] rounded-[22px] border border-slate-300 bg-white px-4 py-4 text-right outline-none dark:border-slate-700 dark:bg-slate-950"
            />
            <button className="mr-auto rounded-[18px] bg-slate-400 px-6 py-4 text-lg font-black text-white">
              أرسل رسالة
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            بيانات المعلن
          </h2>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-800">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                {listing.sellerName || "المعلن"}
              </div>
              <div className="mt-2 text-base text-blue-600">
                شاهد الإعلانات
              </div>
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                معرف البائع: {listing.ownerId || "-"}
              </div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-500 bg-slate-200 text-slate-500 dark:bg-slate-700">
              <CarFront className="h-10 w-10" />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              إعلانات مشابهة
            </h2>
            <Link href="/listings" className="text-lg font-extrabold text-blue-600">
              المزيد
            </Link>
          </div>

          {similarListings.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50 px-4 py-8 text-center text-base font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              لا توجد إعلانات مشابهة الآن.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {similarListings.map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.id}`}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="relative h-48 bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                    <div className="absolute bottom-3 right-3 rounded-xl bg-black/85 px-3 py-2 text-sm font-black text-white">
                      {item.price}
                    </div>
                  </div>

                  <div className="p-4 text-right">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                      {item.city || "ليبيا"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
