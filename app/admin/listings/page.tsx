"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";

type ListingItem = {
  id: string;
  title?: string;
  price?: string;
  city?: string;
  sellerName?: string;
  status?: string;
  ownerId?: string;
};

const ADMIN_UID = "asbel4096@gmail.com";

export default function AdminListingsPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ListingItem[]>([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setAllowed(user?.uid === ADMIN_UID);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!allowed) return;

    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const rows: ListingItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ListingItem, "id">)
      }));
      setItems(rows);
    });

    return () => unsub();
  }, [allowed]);

  const approveListing = async (id: string) => {
    await updateDoc(doc(db, "listings", id), {
      status: "approved"
    });
  };

  const rejectListing = async (id: string) => {
    await updateDoc(doc(db, "listings", id), {
      status: "rejected"
    });
  };

  if (loading) {
    return (
      <section className="container py-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          جارٍ تحميل الصفحة...
        </div>
      </section>
    );
  }

  if (!allowed) {
    return (
      <section className="container py-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          لا تملك صلاحية دخول هذه الصفحة.
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10 pb-32">
      <div className="mb-6 text-right">
        <h1 className="text-3xl font-black text-slate-950 dark:text-white">
          إدارة الإعلانات
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          مراجعة الإعلانات والموافقة عليها أو رفضها
        </p>
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            لا توجد إعلانات حاليًا.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                {item.title || "إعلان بدون عنوان"}
              </div>

              <div className="mt-2 text-slate-500 dark:text-slate-300">
                {item.price || "-"} | {item.city || "-"} | {item.sellerName || "مستخدم"}
              </div>

              <div className="mt-2 text-sm font-bold">
                الحالة: {item.status || "-"}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => approveListing(item.id)}
                  className="rounded-[18px] bg-green-600 px-5 py-3 font-black text-white"
                >
                  موافقة
                </button>

                <button
                  type="button"
                  onClick={() => rejectListing(item.id)}
                  className="rounded-[18px] bg-red-600 px-5 py-3 font-black text-white"
                >
                  رفض
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
