"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatPrice } from "@/lib/utils";

type Listing = {
  id: string;
  title: string;
  category: string;
  city: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  price: number;
  year?: number | null;
  mileage?: number | null;
  fuel?: string;
  transmission?: string;
  description: string;
  images?: string[];
  sellerName: string;
  phone: string;
  whatsapp?: string;
  status: string;
};

const fallbackImage = "/icons/car-card.svg";

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loadListing = async () => {
      try {
        const listingRef = doc(db, "listings", params.id);
        const snap = await getDoc(listingRef);

        if (!snap.exists()) {
          setMissing(true);
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...(snap.data() as Omit<Listing, "id">) };
        setListing(data);
        setLoading(false);

        try {
          await updateDoc(listingRef, { views: increment(1) });
        } catch (error) {
          console.error("Update views error:", error);
        }
      } catch (error) {
        console.error("Load listing details error:", error);
        setMissing(true);
        setLoading(false);
      }
    };

    if (params.id) void loadListing();
  }, [params.id]);

  if (loading) {
    return <section className="container py-10"><div className="card p-6 text-center text-slate-500">جارٍ تحميل تفاصيل الإعلان...</div></section>;
  }

  if (missing || !listing) return notFound();

  const embedMap = listing.latitude && listing.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.02}%2C${listing.latitude - 0.02}%2C${listing.longitude + 0.02}%2C${listing.latitude + 0.02}&layer=mapnik&marker=${listing.latitude}%2C${listing.longitude}`
    : "";

  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {(listing.images?.length ? listing.images : [fallbackImage]).map((image, index) => (
                <div key={`${image}-${index}`} className="h-[220px] overflow-hidden rounded-3xl bg-slate-100 sm:h-[260px] dark:bg-slate-800">
                  <img src={image} alt={`${listing.title}-${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>

            <div className="p-6">
              <div className="badge">{listing.category}</div>
              <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{listing.title}</h1>
              <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                <div><strong>السنة:</strong> {listing.year ?? "-"}</div>
                <div><strong>العداد:</strong> {listing.mileage ? `${listing.mileage.toLocaleString("ar-LY")} كم` : "-"}</div>
                <div><strong>الوقود:</strong> {listing.fuel ?? "-"}</div>
                <div><strong>الناقل:</strong> {listing.transmission ?? "-"}</div>
              </div>
              <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300">{listing.description}</p>
            </div>
          </div>

          {(listing.address || embedMap) ? (
            <div className="card p-6">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white"><MapPin size={18} /><span className="font-black">الموقع</span></div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{listing.city}{listing.address ? ` - ${listing.address}` : ""}</div>
              {embedMap ? <iframe title="listing-map" src={embedMap} className="mt-4 h-72 w-full rounded-3xl border border-slate-200 dark:border-white/10" loading="lazy" /> : null}
              {listing.mapUrl ? <a href={listing.mapUrl} target="_blank" className="btn-secondary mt-4">فتح في الخرائط</a> : null}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="text-sm text-slate-500 dark:text-slate-300">السعر</div>
            <div className="mt-2 text-4xl font-black text-brand-700">{formatPrice(Number(listing.price || 0))}</div>
            <div className="mt-6 grid gap-3">
              <a href={`tel:${listing.phone}`} className="btn-secondary gap-2"><Phone size={18} />اتصال مباشر</a>
              <a href={`https://wa.me/${listing.whatsapp ?? listing.phone}`} className="btn-primary gap-2"><MessageCircle size={18} />واتساب</a>
              <Link href="/messages" className="btn-secondary">فتح الدردشة</Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-brand-700"><ShieldCheck size={18} /><span className="font-black">البائع</span></div>
            <div className="mt-4 text-lg font-black text-slate-950 dark:text-white">{listing.sellerName}</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{listing.city}</div>
            <div className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">تواصل مباشرة مع صاحب الإعلان عبر الاتصال أو واتساب أو الدردشة.</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
