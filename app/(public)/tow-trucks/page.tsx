"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  Loader2,
  MapPin,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { calculateDistanceKm, normalizeLibyanPhone } from "@/lib/utils";
import { libyaCities } from "@/lib/categories";
import { TowTruckCard } from "@/components/tow-trucks/tow-truck-card";
import { useMyLocation } from "@/components/tow-trucks/use-my-location";
import { NearestTowCard } from "@/components/tow-trucks/nearest-tow-card";
import { FavoritesStrip } from "@/components/tow-trucks/favorites-strip";
import { useTowFavorites } from "@/hooks/use-tow-favorites";
import { useToast } from "@/contexts/ToastContext";

/**
 * الخريطة (leaflet ~140KB) تُحمّل ديناميكياً بدون SSR.
 * leaflet يعتمد على window، لذا ssr:false ضروري.
 * هذا يوفّر ~140KB من الحزمة الأولية لكل من لا يفتح هذه الصفحة،
 * بل وحتى لمن يفتحها لا تُحمّل إلا عند ظهور الخريطة.
 */
const TowTrucksMiniMap = dynamic(
  () =>
    import("@/components/tow-trucks/mini-map").then(
      (m) => m.TowTrucksMiniMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    ),
  }
);

/**
 * صفحة الساحبات (tow trucks).
 *
 * تدفّق المستخدم:
 *  1) يفتح الصفحة → يرى قائمة الساحبات (مرتبة بالأحدث افتراضياً).
 *  2) (اختياري) يضغط "استخدم موقعي" → المتصفح يطلب الإذن.
 *  3) لو وافق → الساحبات تُرتَّب بالأقرب وتظهر المسافة لكل واحدة.
 *  4) لو رفض → رسالة هادئة "ابحث بالمدينة بدلاً من ذلك".
 *  5) فلاتر إضافية: مدينة + "متاح الآن فقط".
 *
 * الخصوصية:
 *  - الموقع يُحفظ في state محلية فقط - لا يُرسَل لـFirestore.
 *  - الـrequest يحدث فقط عند ضغط الزر (لا تلقائياً).
 */
export default function TowTrucksPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // الفلاتر
  const [cityFilter, setCityFilter] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const {
    location,
    status: locationStatus,
    errorMessage: locationError,
    requestLocation,
    clearLocation,
  } = useMyLocation();

  // جلب الساحبات من Firestore.
  // الاستعلام: category == "ساحبة سيارات" + status == "approved".
  // الترتيب الأولي من Firestore بـcreatedAt desc؛ بعدها client-side
  // يُعاد الترتيب لو الموقع متاح.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("category", "==", "ساحبة سيارات"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(200)
          )
        );
        if (cancelled) return;
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "تعذّر تحميل الساحبات.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // الترتيب والفلترة client-side
  const filtered = useMemo(() => {
    let arr = items;

    if (cityFilter) {
      arr = arr.filter((it) => it.city === cityFilter);
    }
    if (onlyAvailable) {
      arr = arr.filter((it) => it.availableNow === true);
    }

    // لو الموقع متاح - رتّب بالأقرب
    if (location) {
      arr = [...arr].sort((a, b) => {
        const da = calculateDistanceKm(
          location.latitude,
          location.longitude,
          a.latitude,
          a.longitude
        );
        const db_ = calculateDistanceKm(
          location.latitude,
          location.longitude,
          b.latitude,
          b.longitude
        );
        // الساحبات بدون إحداثيات تذهب لآخر القائمة.
        if (da == null && db_ == null) return 0;
        if (da == null) return 1;
        if (db_ == null) return -1;
        return da - db_;
      });
    }

    return arr;
  }, [items, cityFilter, onlyAvailable, location]);

  const isLocationLoading = locationStatus === "loading";

  // أقرب 3 ساحبات للعرض في القسم المميز - تظهر فقط لو الموقع متاح وفي
  // النتائج بعد الفلترة أكثر من واحدة. الباقي يُعرض في الـgrid السفلي.
  const top3 = location ? filtered.slice(0, 3) : [];
  const rest = location ? filtered.slice(3) : filtered;

  // ============================================================
  // المفضلة: hook + اشتقاق قائمة الـlistings الفعلية للشريط
  // ============================================================
  const {
    ids: favoriteIds,
    orderedIds: orderedFavoriteIds,
    toggle: toggleFavorite,
    signedIn,
  } = useTowFavorites();
  const toast = useToast();

  // نُحوّل orderedFavoriteIds إلى listings كاملة (للعرض في الشريط).
  // نأخذها من `items` الكاملة (وليس filtered) - المفضلة يجب أن تظهر حتى
  // لو خرجت من فلتر المدينة/متاح الآن الحالي.
  // الـorder: نتبع orderedFavoriteIds (الأحدث إضافةً أولاً).
  const favoriteListings = useMemo(() => {
    if (orderedFavoriteIds.length === 0) return [];
    const byId = new Map(items.map((it) => [it.id, it]));
    return orderedFavoriteIds
      .map((id) => byId.get(id))
      .filter((it): it is Listing => Boolean(it));
  }, [orderedFavoriteIds, items]);

  // handler يُمرَّر للخريطة - يلتقط الـtoggle ويعرض toast مناسب.
  const handleMapToggleFavorite = async (id: string) => {
    if (!signedIn) {
      toast.warning("سجّل الدخول لحفظ ساحباتك المفضلة.");
      return;
    }
    try {
      const becameFav = await toggleFavorite(id);
      if (becameFav) {
        toast.success("تمت إضافة الساحبة إلى مفضلتك.");
      }
    } catch {
      toast.error("تعذّر تحديث المفضلة.");
    }
  };

  // النقاط للخريطة - نُحوّل الـlistings إلى شكل تقبله MiniMap.
  // نُمرّر فقط الساحبات التي تحوي إحداثيات. حد 50 كافٍ للأداء، فوقه
  // يصبح الـmarkers مزدحماً بصرياً ويبطّئ pan/zoom على الموبايل.
  const mapPoints = useMemo(
    () =>
      filtered
        .filter(
          (it) =>
            typeof it.latitude === "number" && typeof it.longitude === "number"
        )
        .slice(0, 50)
        .map((it) => ({
          id: it.id,
          lat: it.latitude as number,
          lng: it.longitude as number,
          name: it.title || "ساحبة سيارات",
          city: it.city,
          available: it.availableNow === true,
          phone: it.phone || undefined,
          whatsapp: normalizeLibyanPhone(it.whatsapp || it.phone || "") || undefined,
        })),
    [filtered]
  );

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* العنوان */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
          <Truck size={24} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            ساحبة قريبة منك
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            اعثر على أقرب خدمة سحب سيارات حسب موقعك أو مدينتك.
          </p>
        </div>
      </div>

      {/* ============ ساحباتي المفضلة ============
          يظهر فقط للمسجَّل دخوله ولديه >= 1 محفوظة. مخفي تلقائياً للزوار. */}
      <FavoritesStrip items={favoriteListings} />

      {/* بطاقة "استخدم موقعي" */}
      <div className="
        mb-4 rounded-3xl border border-brand-200 bg-brand-50 p-4
        dark:border-brand-800/40 dark:bg-brand-900/20
      ">
        {location ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 dark:text-brand-300 sm:text-sm">
                <MapPin size={14} />
                تم تحديد موقعك
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                النتائج مرتبة حسب الأقرب إليك.
              </p>
            </div>
            <button
              type="button"
              onClick={clearLocation}
              className="
                inline-flex h-9 shrink-0 items-center gap-1 rounded-2xl
                border border-slate-200 bg-white px-3 text-xs font-black
                text-slate-700 transition hover:bg-slate-50
                dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
                dark:hover:bg-slate-800
              "
            >
              <X size={12} />
              إلغاء
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2.5 text-[11px] leading-5 text-slate-600 dark:text-slate-300 sm:text-xs">
              <ShieldCheck size={12} className="me-1 inline" />
              نستخدم موقعك فقط لعرض أقرب الخدمات، ولا نقوم بحفظه.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocationLoading}
              className="
                inline-flex h-11 w-full items-center justify-center gap-1.5
                rounded-2xl bg-action-500 text-sm font-black text-white shadow-action
                transition active:scale-95 hover:bg-action-600
                disabled:opacity-60
              "
            >
              {isLocationLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              {isLocationLoading ? "جارٍ تحديد الموقع..." : "استخدم موقعي"}
            </button>
            {locationError && (
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">
                {locationError}
              </p>
            )}
          </>
        )}
      </div>

      {/* الخريطة المصغّرة - تظهر دائماً (placeholder قبل الإذن، خريطة بعد) */}
      <div className="mb-4">
        <TowTrucksMiniMap
          userLat={location?.latitude ?? null}
          userLng={location?.longitude ?? null}
          points={mapPoints}
          favoriteIds={signedIn ? favoriteIds : undefined}
          onToggleFavorite={handleMapToggleFavorite}
        />
      </div>

      {/* الفلاتر */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="
            h-10 flex-1 min-w-[140px] rounded-2xl border border-slate-200
            bg-white px-3 text-xs font-bold text-slate-700
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
          "
        >
          <option value="">كل المدن</option>
          {libyaCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyAvailable((v) => !v)}
          className={`inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-xs font-black transition ${
            onlyAvailable
              ? "bg-emerald-500 text-white shadow-md"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              onlyAvailable ? "bg-white" : "bg-emerald-500"
            }`}
          />
          متاح الآن فقط
        </button>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-900"
            >
              <div className="skeleton aspect-[4/3] !rounded-none" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Truck
            size={40}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {items.length === 0
              ? "لا توجد ساحبات مسجّلة حالياً."
              : "لا توجد ساحبات بهذه المعايير."}
          </p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCityFilter("");
                setOnlyAvailable(false);
              }}
              className="mt-3 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      ) : (
        <>
          {/* قسم "أقرب 3" - فقط عندما يكون الموقع متاحاً */}
          {top3.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2.5 flex items-center justify-between gap-2 px-1">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  أقرب الساحبات إليك
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  متاحة
                </span>
              </h2>
              <div className="space-y-3">
                {top3.map((it, idx) => (
                  <NearestTowCard
                    key={it.id}
                    listing={it}
                    userLat={location?.latitude ?? null}
                    userLng={location?.longitude ?? null}
                    isClosest={idx === 0}
                    priority={idx === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* باقي القائمة - grid */}
          {rest.length > 0 && (
            <div>
              {top3.length > 0 && (
                <h2 className="mb-2.5 px-1 text-sm font-black text-slate-900 dark:text-white">
                  كل الساحبات
                </h2>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((it, idx) => (
                  <TowTruckCard
                    key={it.id}
                    listing={it}
                    userLat={location?.latitude ?? null}
                    userLng={location?.longitude ?? null}
                    priority={idx < 2 && top3.length === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
