"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type ListingItem = {
  id: string;
  title?: string;
  price?: string;
  city?: string;
  sellerName?: string;
  status?: string;
};

const ADMIN_UID = "ضع_هنا_uid_حسابك";

export default function AdminListingsPage() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setAllowed(user?.uid === ADMIN_UID);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!allowed) return;

    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({
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

  if (!allowed) {
    return (
      <section className="container py-10">
        <div className="rounded-3xl border bg-white p-6 text-center">
          لا تملك صلاحية دخول هذه الصفحة.
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mb-6 text-right">
        <h1 className="text-3xl font-black">إدارة الإعلانات</h1>
        <p className="mt-2 text-slate-500">مراجعة وموافقة الإعلانات</p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border bg-white p-5 text-right shadow-sm"
          >
            <div className="text-2xl font-black">{item.title || "إعلان بدون عنوان"}</div>
            <div className="mt-2 text-slate-500">
              {item.price || "-"} | {item.city || "-"} | {item.sellerName || "مستخدم"}
            </div>
            <div className="mt-2 text-sm font-bold">
              الحالة: {item.status || "-"}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => approveListing(item.id)}
                className="rounded-2xl bg-green-600 px-5 py-3 font-black text-white"
              >
                موافقة
              </button>

              <button
                onClick={() => rejectListing(item.id)}
                className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white"
              >
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
