"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import {
  calculateDistanceKm,
  formatDistance,
  formatPrice,
  normalizeLibyanPhone,
} from "@/lib/utils";
import { useMyLocation } from "@/components/tow-trucks/use-my-location";

/**
 * صفحة تفاصيل ساحبة سيارات واحدة.
 *
 * تعرض:
 *  - معرض صور (Carousel بسيط).
 *  - الاسم + الحالة (متاح/غير متاح).
 *  - المدينة + المنطقة + المناطق المغطاة.
 *  - المسافة (لو المستخدم فعّل الموقع).
 *  - السعر + الوصف.
 *  - أزرار: اتصال، واتساب، رابط الموقع (لو موجود).
 */
export default function TowTruckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  const { location, requestLocation, status: locStatus } = useMyLocation();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "listings", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setError("الخدمة غير موجودة أو حُذفت.");
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as any) } as Listing;
        if (data.status !== "approved") {
          setError("الخدمة غير متاحة حالياً.");
          setLoading(false);
          return;
        }
        setListing(data);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "تعذّر تحميل البيانات.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container py-10 text-center text-slate-500">
        جارٍ التحميل...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container py-10 text-center">
        <p className="text-rose-600 dark:text-rose-300">
          {error || "الخدمة غير موجودة."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/tow-trucks")}
          className="mt-3 inline-flex items-center gap-1 text-sm font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          <ArrowRight size={14} />
          الرجوع للساحبات
        </button>
      </div>
    );
  }

  const phone = listing.phone || "";
  const wa = normalizeLibyanPhone(listing.whatsapp || phone);
  const available = listing.availableNow === true;
  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const hasImages = images.length > 0;

  const distanceKm = location
    ? calculateDistanceKm(
        location.latitude,
        location.longitude,
        listing.latitude,
        listing.longitude
      )
    : null;
  const distanceText = formatDistance(distanceKm);

  const goPrev = () => setPhotoIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const goNext = () => setPhotoIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* زر الرجوع */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1 text-sm font-black text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
      >
        <ArrowRight size={14} />
        رجوع
      </button>

      {/* معرض الصور */}
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
        {hasImages ? (
          <>
            <Image
              src={images[photoIdx]}
              alt={listing.title || "ساحبة"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              priority
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition active:scale-95 hover:bg-black/70"
                  aria-label="السابق"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition active:scale-95 hover:bg-black/70"
                  aria-label="التالي"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
                  {photoIdx + 1} / {images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Truck size={64} strokeWidth={1.5} />
          </div>
        )}

        {/* البادجات */}
        {available && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            متاح الآن
          </span>
        )}
      </div>

      {/* الاسم والمعلومات */}
      <div className="card p-4">
        <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
          {listing.title || "ساحبة سيارات"}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          {listing.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {listing.city}
              {listing.area && ` — ${listing.area}`}
            </span>
          )}
          {distanceText && (
            <span className="inline-flex items-center gap-1 font-black text-brand-700 dark:text-brand-300">
              <Navigation size={12} />
              يبعد عنك {distanceText}
            </span>
          )}
        </div>

        {/* السعر */}
        {Number(listing.price) > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-action-50 px-3 py-2 dark:bg-action-900/20">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              السعر التقريبي:
            </span>
            <span className="text-sm font-black text-action-700 dark:text-action-300">
              {formatPrice(listing.price)} د.ل
            </span>
          </div>
        )}

        {/* المناطق المغطاة */}
        {listing.coverageAreas && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
              المناطق التي تغطيها
            </h3>
            <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
              {listing.coverageAreas}
            </p>
          </div>
        )}

        {/* الوصف */}
        {listing.description && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
              وصف الخدمة
            </h3>
            <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600 dark:text-slate-300">
              {listing.description}
            </p>
          </div>
        )}

        {/* أزرار */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 text-sm font-black text-white shadow-blue transition active:scale-95 hover:bg-brand-600"
            >
              <Phone size={16} />
              اتصال
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 text-sm font-black text-white transition active:scale-95 hover:bg-emerald-600"
            >
              <MessageCircle size={16} />
              واتساب
            </a>
          )}
        </div>

        {/* رابط الموقع */}
        {listing.locationUrl && (
          <a
            href={listing.locationUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink size={14} />
            افتح الموقع على الخريطة
          </a>
        )}

        {/* استخدم موقعي لاحقاً */}
        {!location && locStatus === "idle" && (
          <button
            type="button"
            onClick={requestLocation}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-action-200 bg-action-50 text-sm font-black text-action-700 transition hover:bg-action-100 dark:border-action-800/40 dark:bg-action-900/20 dark:text-action-300 dark:hover:bg-action-900/30"
          >
            <MapPin size={14} />
            استخدم موقعي لمعرفة المسافة
          </button>
        )}
        {!location && locStatus === "idle" && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <ShieldCheck size={10} />
            موقعك لا يُحفَظ.
          </p>
        )}
      </div>

      {/* رابط ملف صاحب الخدمة */}
      {listing.ownerId && (
        <Link
          href={`/traders/${listing.ownerId}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          عرض ملف صاحب الخدمة
          <ArrowRight size={12} />
        </Link>
      )}
    </section>
  );
}
