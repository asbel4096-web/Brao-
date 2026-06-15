"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Timestamp,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Megaphone, MapPin, Phone, MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";
import { formatPrice, normalizeLibyanPhone } from "@/lib/utils";
import { trackEvent } from "@/lib/track-event";

/**
 * SponsoredSpotlight — بانر "ممول 📢" موحّد على مستوى المنصة.
 *
 * يظهر إعلاناً ممولاً واحداً كبيراً في كل لحظة (دوّار) أعلى النتائج:
 *  - الصفحة الرئيسية / صفحات الأقسام / صفحة البحث / تفاصيل الإعلان.
 *
 * الميزات:
 *  - Auto-play (يتوقف عند لمس المستخدم).
 *  - Swipe (سحب أفقي) + نقاط تنقّل.
 *  - شارة "ممول" واضحة.
 *  - Impression tracking (مرّة لكل إعلان لكل تحميل) + Click tracking
 *    عبر /api/listings/track (Admin SDK، آمن).
 *  - Mobile-first، غير مزعج، وبطاقة كبيرة واحدة فقط في نفس الوقت.
 *  - يُخفي نفسه تماماً لو لا توجد إعلانات ممولة.
 *
 * مصدر البيانات:
 *  - إن مُرّر `items` (مثل صفحة الإعلانات التي حمّلتها مسبقاً) نفلتر منها.
 *  - وإلا نجلب الممولة عبر استعلام boostedUntil (فهرس مفرد تلقائي — بلا
 *    composite index).
 */

function isBoosted(l: Listing): boolean {
  const until = (l as any).boostedUntil?.toMillis?.() || 0;
  return until > Date.now();
}

interface Props {
  /** قائمة محمّلة مسبقاً (اختياري) — تُفلتر منها الممولة بدل الجلب. */
  items?: Listing[];
  /** حصر النتائج بفئة معيّنة (لصفحات الأقسام). */
  category?: string;
  /** كلمة بحث لمطابقة العنوان (لصفحة البحث). */
  query?: string;
  /** استبعاد إعلان (لصفحة التفاصيل). */
  excludeId?: string;
  /** عنوان القسم. */
  title?: string;
  /** أقصى عدد إعلانات في الدوّار. */
  max?: number;
  /** يُلغي حاوية .container (عند التضمين داخل صفحة لها حاوية أصلاً). */
  bare?: boolean;
}

export function SponsoredSpotlight({
  items,
  category,
  query: searchQuery,
  excludeId,
  title = "إعلان ممول",
  max = 8,
  bare = false,
}: Props) {
  const [fetched, setFetched] = useState<Listing[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const { user } = useAuth();
  const seen = useRef<Set<string>>(new Set());
  const touchX = useRef<number | null>(null);

  // جلب الممولة فقط إذا لم تُمرَّر قائمة جاهزة.
  useEffect(() => {
    if (items) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("boostedUntil", ">", Timestamp.fromMillis(Date.now())),
            orderBy("boostedUntil", "desc"),
            limit(20)
          )
        );
        if (!cancelled) {
          setFetched(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[sponsored] fetch:", (err as any)?.code);
        if (!cancelled) setFetched([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const ads = useMemo(() => {
    const source = items ?? fetched ?? [];
    const q = (searchQuery || "").trim().toLowerCase();
    return source
      .filter((l) => isBoosted(l))
      .filter((l) => (l as any).status === "approved" || items) // القائمة المُمرّرة معتمدة أصلاً
      .filter((l) => l.id !== excludeId)
      .filter((l) => (category ? l.category === category : true))
      .filter((l) =>
        q ? (l.title || "").toLowerCase().includes(q) : true
      )
      .slice(0, max);
  }, [items, fetched, category, searchQuery, excludeId, max]);

  // بداية عشوائية عند تغيّر القائمة — يمنع ظهور نفس الإعلان أولاً في كل
  // مرّة (منع التكرار المزعج) ويوزّع الظهور بعدالة على كل المعلنين.
  useEffect(() => {
    setIdx(ads.length > 1 ? Math.floor(Math.random() * ads.length) : 0);
  }, [ads.length]);

  // Auto-play (يتوقّف عند اللمس/التحويم أو عند إعلان واحد فقط).
  useEffect(() => {
    if (paused || ads.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % ads.length);
    }, 4500);
    return () => clearInterval(t);
  }, [paused, ads.length]);

  // Impression tracking — مرّة واحدة لكل إعلان يظهر فعلاً.
  useEffect(() => {
    const current = ads[idx];
    if (!current?.id) return;
    if (seen.current.has(current.id)) return;
    seen.current.add(current.id);
    void trackEvent(current.id, "sponsoredImpression");
  }, [idx, ads]);

  if (ads.length === 0) return null;

  const ad = ads[idx];
  const wa = normalizeLibyanPhone((ad as any).whatsapp || ad.phone || "");
  const img = ad.images?.[0] || "/icons/car-card.svg";
  const href = `/listings/${ad.id}`;

  const goNext = () => setIdx((i) => (i + 1) % ads.length);
  const goPrev = () => setIdx((i) => (i - 1 + ads.length) % ads.length);

  return (
    <section
      dir="rtl"
      aria-label="إعلان ممول"
      className={bare ? "my-3" : "container my-3"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="
          relative overflow-hidden rounded-3xl border border-amber-200/70
          bg-white shadow-[0_4px_24px_-10px_rgba(245,158,11,0.35)]
          dark:border-amber-500/20 dark:bg-slate-900
        "
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          // RTL: سحب لليسار = التالي، لليمين = السابق
          if (dx < -40) goNext();
          else if (dx > 40) goPrev();
          touchX.current = null;
        }}
      >
        <Link
          href={href}
          onClick={() => void trackEvent(ad.id, "sponsoredClick")}
          className="block"
        >
          {/* الصورة + التراكب */}
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/7]">
            <Image
              src={img}
              alt={ad.title || "إعلان ممول"}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

            {/* شارة ممول واضحة */}
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[12px] font-black text-amber-950 shadow-sm">
              <Megaphone size={13} strokeWidth={2.5} />
              {user && (ad as any).ownerId === user.uid ? "إعلانك الممول" : "إعلان ممول"}
            </span>

            {/* النص أسفل الصورة */}
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <h3 className="line-clamp-1 text-lg font-black drop-shadow-sm sm:text-xl">
                {ad.title}
              </h3>
              <div className="mt-1 flex items-center gap-3">
                <span className="inline-flex items-baseline gap-1 text-xl font-black text-amber-300 sm:text-2xl">
                  {formatPrice(ad.price)}
                  <span className="text-xs font-bold">د.ل</span>
                </span>
                {ad.city && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white/85">
                    <MapPin size={12} />
                    {ad.city}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* أزرار CTA */}
        <div className="flex items-stretch gap-2 p-3">
          <a
            href={ad.phone ? `tel:${ad.phone}` : "#"}
            onClick={(e) => {
              if (!ad.phone) {
                e.preventDefault();
                return;
              }
              void trackEvent(ad.id, "sponsoredClick");
              void trackEvent(ad.id, "phone");
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 py-2.5 text-sm font-black text-white transition hover:bg-brand-800 active:scale-95"
          >
            <Phone size={16} />
            اتصال
          </a>
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void trackEvent(ad.id, "sponsoredClick");
                void trackEvent(ad.id, "whatsapp");
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 active:scale-95"
            >
              <MessageCircle size={16} />
              واتساب
            </a>
          )}
        </div>

        {/* نقاط التنقّل */}
        {ads.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {ads.map((a, i) => (
              <button
                key={a.id}
                type="button"
                aria-label={`إعلان ${i + 1}`}
                onClick={() => setIdx(i)}
                className={
                  i === idx
                    ? "h-1.5 w-5 rounded-full bg-amber-500 transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-slate-300 transition-all dark:bg-slate-600"
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SponsoredSpotlight;
