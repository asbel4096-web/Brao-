"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase";

type Listing = {
  id: string;
  title: string;
  category: string;
  price: number | string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
  status: string;
  featured?: boolean;
  views?: number;
};

const ADMIN_EMAILS = ["asbel4096@gmail.com"];

export default function AdminPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      setListings([]);
      setLoading(false);
      return;
    }

    const listingsRef = collection(db, "listings");
    const listingsQuery = query(listingsRef, orderBy("title", "asc"));

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const items: Listing[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Listing, "id">)
        }));

        setListings(items);
        setLoading(false);
      },
      (error) => {
        console.error("Admin listings load error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredListings = useMemo(() => {
    if (filter === "all") return listings;
    return listings.filter((item) => item.status === filter);
  }, [listings, filter]);

  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      alert("فشل تسجيل الدخول.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const approveListing = async (id: string) => {
    try {
      setBusyId(id);
      await updateDoc(doc(db, "listings", id), { status: "approved" });
    } catch (error) {
      console.error("Approve error:", error);
      alert("فشل اعتماد الإعلان.");
    } finally {
      setBusyId(null);
    }
  };

  const returnToPending = async (id: string) => {
    try {
      setBusyId(id);
      await updateDoc(doc(db, "listings", id), { status: "pending" });
    } catch (error) {
      console.error("Pending error:", error);
      alert("فشل إعادة الإعلان إلى الانتظار.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteListing = async (id: string) => {
    const confirmed = window.confirm("هل تريد حذف هذا الإعلان نهائيًا؟");
    if (!confirmed) return;

    try {
      setBusyId(id);
      await deleteDoc(doc(db, "listings", id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("فشل حذف الإعلان.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <section className="container py-10">
        <div className="card p-6 text-center text-slate-500">جارٍ التحقق من الدخول...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-xl card p-8 text-center">
          <h1 className="section-title">لوحة المشرف</h1>
          <p className="section-subtitle mb-6">سجّل الدخول أولًا للمتابعة.</p>
          <button className="btn btn-primary" onClick={handleGoogleLogin}>
            تسجيل الدخول عبر Google
          </button>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-xl card p-8 text-center">
          <h1 className="section-title">غير مصرح</h1>
          <p className="section-subtitle mb-3">
            هذا البريد ليس لديه صلاحية دخول لوحة المشرف.
          </p>
          <p className="mb-6 text-sm text-slate-500">{user.email}</p>
          <button className="btn btn-secondary" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">لوحة المشرف</h1>
          <p className="section-subtitle">
            اعتماد الإعلانات أو إرجاعها للانتظار أو حذفها.
          </p>
          <p className="mt-2 text-sm text-slate-500">مسجل الدخول: {user.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              filter === "all"
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => setFilter("all")}
          >
            الكل
          </button>

          <button
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              filter === "pending"
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => setFilter("pending")}
          >
            بانتظار الاعتماد
          </button>

          <button
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              filter === "approved"
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => setFilter("approved")}
          >
            معتمد
          </button>

          <button className="btn btn-secondary" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">إجمالي الإعلانات</p>
          <p className="mt-2 text-3xl font-black">{listings.length}</p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-slate-500">بانتظار الاعتماد</p>
          <p className="mt-2 text-3xl font-black">
            {listings.filter((x) => x.status === "pending").length}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-slate-500">الإعلانات المعتمدة</p>
          <p className="mt-2 text-3xl font-black">
            {listings.filter((x) => x.status === "approved").length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-center text-slate-500">جارٍ تحميل الإعلانات...</div>
      ) : filteredListings.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">لا توجد إعلانات في هذا القسم.</div>
      ) : (
        <div className="grid gap-4">
          {filteredListings.map((item) => (
            <article key={item.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="badge">{item.category || "إعلان"}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status === "approved" ? "معتمد" : "بانتظار الاعتماد"}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-slate-900">
                    {item.title || "بدون عنوان"}
                  </h2>

                  <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                    <p><span className="font-bold">المدينة:</span> {item.city || "-"}</p>
                    <p><span className="font-bold">السعر:</span> {item.price || "-"}</p>
                    <p><span className="font-bold">البائع:</span> {item.sellerName || "-"}</p>
                    <p><span className="font-bold">الهاتف:</span> {item.phone || "-"}</p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {item.description || "لا يوجد وصف."}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-[220px]">
                  {item.status !== "approved" ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => approveListing(item.id)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? "جارٍ التنفيذ..." : "اعتماد الإعلان"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => returnToPending(item.id)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? "جارٍ التنفيذ..." : "إرجاع للانتظار"}
                    </button>
                  )}

                  <button
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                    onClick={() => deleteListing(item.id)}
                    disabled={busyId === item.id}
                  >
                    {busyId === item.id ? "جارٍ التنفيذ..." : "حذف الإعلان"}
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
