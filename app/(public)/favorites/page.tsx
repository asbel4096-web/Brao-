"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2 } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPrice } from "@/lib/utils";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { favorites, loading } = useFavorites();
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/favorites");
  }, [user, authLoading, router]);

  const handleRemove = async (id: string) => {
    if (!user) return;
    setRemoving(id);
    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", id));
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
        <p className="section-subtitle">الإعلانات التي حفظتها للرجوع إليها لاحقاً.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-72" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="card p-10 text-center">
          <Heart size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            لا توجد إعلانات في المفضلة بعد.
          </p>
          <Link href="/listings" className="btn-primary mt-4 inline-flex">
            تصفح الإعلانات
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <article key={f.id} className="card overflow-hidden p-0">
              <Link
                href={`/listings/${f.listingId}`}
                className="relative block h-44 bg-slate-100 dark:bg-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.snapshot?.image || "/icons/car-card.svg"}
                  alt={f.snapshot?.title || "إعلان"}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="badge">{f.snapshot?.category || "إعلان"}</span>
                  <span className="text-base font-black text-brand-700 dark:text-brand-300">
                    {formatPrice(f.snapshot?.price || 0)}
                  </span>
                </div>
                <Link href={`/listings/${f.listingId}`}>
                  <h3 className="mt-2 line-clamp-2 text-base font-black dark:text-white">
                    {f.snapshot?.title || "إعلان"}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-slate-500">{f.snapshot?.city}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/listings/${f.listingId}`}
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
                    إزالة
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
