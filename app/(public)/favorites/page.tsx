"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useFavoriteState } from "@/hooks/useFavorites";
import { useToast } from "@/contexts/ToastContext";
import { formatPrice } from "@/lib/utils";
import { SponsoredSpotlight } from "@/components/sponsored-spotlight";

/**
 * صفحة المفضلة — أُعيد تصميمها بنفس لغة ListingCard:
 *
 * - بطاقات 2 cols على الجوال (مثل /listings)
 * - الإزالة عبر زر Bookmark على الصورة (يستخدم useFavoriteState)
 * - السعر كبسولة فوق الصورة (نفس النمط)
 * - empty state واضح وموجَّه
 */

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { favorites, loading } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/favorites");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4 sm:py-8">
      <div className="mb-4">
        <h1 className="inline-flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
          <Heart className="text-rose-600" size={26} />
          المفضلة
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          {favorites.length > 0
            ? `${favorites.length.toLocaleString("ar-LY")} إعلان محفوظ`
            : "الإعلانات التي حفظتها للرجوع إليها لاحقاً."}
        </p>
      </div>

      {/* إعلان ممول قد يهمك */}
      <SponsoredSpotlight title="إعلانات ممولة" bare />

      {loading ? (
        <FavoritesGridSkeleton />
      ) : favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((fav) => (
            <FavoriteCard key={fav.id} favorite={fav} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * بطاقة المفضلة - تطابق نمط ListingCard لكن من snapshot
 * ============================================================ */

function FavoriteCard({
  favorite,
}: {
  favorite: ReturnType<typeof useFavorites>["favorites"][number];
}) {
  const snap = favorite.snapshot;
  const detailsHref = `/listings/${favorite.listingId}`;

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-slate-200/70 bg-white
        shadow-card transition-all duration-300
        hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-blue
        dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      <Link
        href={detailsHref}
        prefetch={false}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800"
        aria-label={snap?.title || "إعلان"}
      >
        <Image
          src={snap?.image || "/icons/car-card.svg"}
          alt={snap?.title || "إعلان"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          className={
            snap?.image
              ? "object-cover transition duration-500 group-hover:scale-[1.04]"
              : "object-contain p-12 opacity-50"
          }
        />

        {snap?.image && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent"
            />
          </>
        )}

        {/* زر إزالة المفضلة (Bookmark filled) */}
        <div className="absolute left-3 top-3">
          <RemoveFavoriteButton
            listingId={favorite.listingId}
            snapshot={snap}
          />
        </div>

        {/* السعر */}
        <div className="absolute bottom-3 right-3">
          <div
            className="
              rounded-2xl border border-white/20
              bg-brand-700/95 px-3.5 py-2
              shadow-blue backdrop-blur-md
            "
          >
            <span className="text-base font-black leading-none text-white sm:text-lg">
              {formatPrice(snap?.price || 0)}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <span className="badge !py-0.5 !text-[10px] sm:!text-xs">
          {snap?.category || "إعلان"}
        </span>

        <Link href={detailsHref} prefetch={false} className="mt-2 group/title">
          <h3
            className="
              line-clamp-2 min-h-[2.5rem] text-sm font-black leading-snug
              text-slate-950 transition-colors
              group-hover/title:text-brand-700
              dark:text-white dark:group-hover/title:text-brand-300
              sm:text-base
            "
          >
            {snap?.title || "إعلان"}
          </h3>
        </Link>

        {snap?.city && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin
              size={12}
              className="text-brand-700/70 dark:text-brand-300/70"
            />
            {snap.city}
          </div>
        )}

        <Link
          href={detailsHref}
          prefetch={false}
          className="
            btn-primary mt-3 !py-2 !text-xs
          "
        >
          عرض الإعلان
        </Link>
      </div>
    </article>
  );
}

/* ============================================================
 * زر إزالة المفضلة - يستخدم useFavoriteState (نفس مصدر ListingCard)
 * ============================================================ */

function RemoveFavoriteButton({
  listingId,
  snapshot,
}: {
  listingId: string;
  snapshot?: { title: string; price: number; city: string; image?: string; category: string };
}) {
  const toast = useToast();
  const { toggle } = useFavoriteState(listingId);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggle({
        id: listingId,
        title: snapshot?.title || "",
        price: Number(snapshot?.price || 0),
        city: snapshot?.city || "",
        category: snapshot?.category || "",
        images: snapshot?.image ? [snapshot.image] : [],
      } as any);
      toast.info("تمت الإزالة من المفضلة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحديث المفضلة.");
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="إزالة من المفضلة"
      className="
        inline-flex h-10 w-10 items-center justify-center
        rounded-full border border-white/30 bg-brand-700/95
        text-white shadow-blue backdrop-blur transition
        hover:bg-brand-800 active:scale-95
      "
    >
      <Bookmark size={18} className="fill-current" />
    </button>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function FavoritesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="
            overflow-hidden rounded-3xl border border-slate-200/70
            bg-white shadow-card dark:border-slate-700/70 dark:bg-slate-900
          "
        >
          <div className="skeleton aspect-[4/3] !rounded-none" />
          <div className="space-y-2 p-3.5 sm:p-4">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-9 w-full !rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center sm:p-10">
      <div
        className="
          mx-auto flex h-16 w-16 items-center justify-center
          rounded-2xl bg-rose-50 text-rose-600
          dark:bg-rose-900/30 dark:text-rose-400
        "
      >
        <Heart size={28} />
      </div>
      <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
        لا توجد إعلانات في المفضلة
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        احفظ أي إعلان يعجبك بزر <Bookmark size={14} className="mx-1 inline-block" /> لتجده هنا بسرعة.
      </p>
      <Link
        href="/listings"
        className="btn-primary mt-5 inline-flex"
      >
        تصفّح الإعلانات
      </Link>
    </div>
  );
}
