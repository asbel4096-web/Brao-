"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, MapPin } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/contexts/ToastContext";
import { formatPrice } from "@/lib/utils";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { favorites, loading } = useFavorites();
  const toast = useToast();
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/favorites");
  }, [user, authLoading, router]);

  const handleRemove = async (id: string) => {
    if (!user) return;
    setRemoving(id);
    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", id));
      toast.success("تمت الإزالة من المفضلة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الإزالة من المفضلة.");
    } finally {
      setRemoving(null);
    }
  };

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
    <section className="container py-6 sm:py-10">
      <div className="mb-5">
        <h1 className="section-title flex items-center gap-2">
          <Heart className="text-rose-600" /> المفضلة
        </h1>
        <p className="section-subtitle">
          {favorites.length > 0
            ? `${favorites.length.toLocaleString("ar-LY")} إعلان محفوظ`
            : "الإعلانات التي حفظتها للرجوع إليها لاحقاً."}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton aspect-[4/3]" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <Heart size={32} />
          </div>
          <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
            لا توجد إعلانات في المفضلة بعد
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            أضف الإعلانات التي تعجبك لتجدها هنا بسرعة.
          </p>
          <Link href="/listings" className="btn-primary mt-4 inline-flex">
            تصفح الإعلانات
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <article
              key={f.id}
              className="
                group flex h-full flex-col overflow-hidden
                rounded-3xl border border-slate-200/80 bg-white
                shadow-card transition-all
                hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-blue
                dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-brand-700
              "
            >
              <Link
                href={`/listings/${f.listingId}`}
                prefetch={false}
                className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <Image
                  src={f.snapshot?.image || "/icons/car-card.svg"}
                  alt={f.snapshot?.title || "إعلان"}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                  className={
                    f.snapshot?.image
                      ? "object-cover transition duration-500 group-hover:scale-105"
                      : "object-contain p-10 opacity-50"
                  }
                />

                {f.snapshot?.image && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"
                  />
                )}

                <div className="absolute bottom-3 left-3 rounded-2xl border border-white/20 bg-brand-700/90 px-3 py-1.5 shadow-blue backdrop-blur-md">
                  <span className="text-sm font-black text-white">
                    {formatPrice(f.snapshot?.price || 0)}
                  </span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2">
                  <span className="badge">{f.snapshot?.category || "إعلان"}</span>
                </div>

                <Link href={`/listings/${f.listingId}`} prefetch={false}>
                  <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-black leading-snug text-slate-950 transition-colors hover:text-brand-700 dark:text-white dark:hover:text-brand-300">
                    {f.snapshot?.title || "إعلان"}
                  </h3>
                </Link>

                {f.snapshot?.city && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin size={13} className="text-brand-700/70 dark:text-brand-300/70" />
                    {f.snapshot.city}
                  </div>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <Link
                    href={`/listings/${f.listingId}`}
                    prefetch={false}
                    className="btn-primary !py-2 !text-xs"
                  >
                    عرض
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.id)}
                    disabled={removing === f.id}
                    className="btn-secondary !py-2 !text-xs"
                  >
                    <Trash2 size={14} />
                    {removing === f.id ? "..." : "إزالة"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
