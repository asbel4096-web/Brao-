"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PencilLine,
  Trash2,
  Eye,
  CirclePlus,
  Clock3,
  CheckCircle2,
  XCircle
} from "lucide-react";

type MyListing = {
  id: string;
  title: string;
  price: string;
  city: string;
  year?: string;
  status: "pending" | "approved" | "rejected";
};

const myListingsData: MyListing[] = [
  {
    id: "1",
    title: "مرسيدس E350 2014",
    price: "65,000 د.ل",
    city: "طرابلس",
    year: "2014",
    status: "pending"
  },
  {
    id: "2",
    title: "هيونداي أزيرا 2012",
    price: "22,800 د.ل",
    city: "بنغازي",
    year: "2012",
    status: "approved"
  },
  {
    id: "3",
    title: "قطع غيار هيونداي",
    price: "على السوم",
    city: "زليتن",
    status: "rejected"
  }
];

function statusMeta(status: MyListing["status"]) {
  switch (status) {
    case "approved":
      return {
        label: "منشور",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40"
      };
    case "rejected":
      return {
        label: "مرفوض",
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40"
      };
    default:
      return {
        label: "بانتظار الموافقة",
        icon: Clock3,
        className:
          "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40"
      };
  }
}

export default function MyListingsPage() {
  const [listings] = useState<MyListing[]>(myListingsData);

  const stats = useMemo(() => {
    return {
      total: listings.length,
      approved: listings.filter((item) => item.status === "approved").length,
      pending: listings.filter((item) => item.status === "pending").length,
      rejected: listings.filter((item) => item.status === "rejected").length
    };
  }, [listings]);

  return (
    <section className="container pb-8">
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/add-listing"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F58233] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(245,130,51,0.24)]"
            >
              <CirclePlus className="h-5 w-5" />
              <span>إضافة إعلان</span>
            </Link>

            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                إعلاناتي
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                متابعة وإدارة كل إعلاناتك من مكان واحد.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-slate-950 dark:text-white">
              {stats.total}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              إجمالي الإعلانات
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-emerald-600">
              {stats.approved}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              منشور
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-amber-600">
              {stats.pending}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              قيد المراجعة
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-red-600">
              {stats.rejected}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              مرفوض
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              القائمة
            </h2>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {listings.length} إعلان
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50 px-4 py-10 text-center text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              لا توجد إعلانات لديك حتى الآن.
            </div>
          ) : (
            <div className="grid gap-4">
              {listings.map((listing) => {
                const meta = statusMeta(listing.status);
                const Icon = meta.icon;

                return (
                  <div
                    key={listing.id}
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                      <div className="relative h-44 rounded-[20px] bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                        <div className="absolute bottom-3 right-3 rounded-xl bg-black/85 px-3 py-2 text-sm font-black text-white">
                          {listing.price}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black ${meta.className}`}>
                            <Icon className="h-4 w-4" />
                            {meta.label}
                          </span>

                          <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                            {listing.title}
                          </h3>
                        </div>

                        <div className="mt-3 flex flex-wrap justify-end gap-2 text-sm">
                          {listing.year ? (
                            <span className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {listing.year}
                            </span>
                          ) : null}

                          <span className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {listing.city}
                          </span>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-3">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="inline-flex items-center gap-2 rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            <Eye className="h-4 w-4" />
                            عرض
                          </Link>

                          <Link
                            href={`/edit-listing/${listing.id}`}
                            className="inline-flex items-center gap-2 rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            <PencilLine className="h-4 w-4" />
                            تعديل
                          </Link>

                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-[18px] bg-red-50 px-4 py-3 text-sm font-black text-red-600 dark:bg-red-950/20 dark:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
