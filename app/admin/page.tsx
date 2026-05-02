"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ListChecks, Users, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { db } from "@/lib/firebase";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0,
    totalUsers: 0, totalViews: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const unsubL = onSnapshot(collection(db, "listings"), (snap) => {
      let total = 0, pending = 0, approved = 0, rejected = 0, views = 0;
      const arr: any[] = [];
      snap.forEach((d) => {
        const it = { id: d.id, ...(d.data() as any) };
        total++;
        if (it.status === "pending") pending++;
        else if (it.status === "approved") approved++;
        else if (it.status === "rejected") rejected++;
        views += Number(it.views) || 0;
        arr.push(it);
      });
      arr.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });
      setStats((p) => ({ ...p, total, pending, approved, rejected, totalViews: views }));
      setRecent(arr.slice(0, 6));
    });
    const unsubU = onSnapshot(collection(db, "users"), (snap) => {
      setStats((p) => ({ ...p, totalUsers: snap.size }));
    });
    return () => { unsubL(); unsubU(); };
  }, []);

  const cards = [
    { label: "إجمالي الإعلانات", value: stats.total, Icon: ListChecks, color: "text-brand-700" },
    { label: "بانتظار المراجعة", value: stats.pending, Icon: Clock, color: "text-amber-600" },
    { label: "معتمدة", value: stats.approved, Icon: CheckCircle, color: "text-emerald-600" },
    { label: "مرفوضة", value: stats.rejected, Icon: XCircle, color: "text-rose-600" },
    { label: "المستخدمون", value: stats.totalUsers, Icon: Users, color: "text-brand-700" },
    { label: "إجمالي المشاهدات", value: stats.totalViews, Icon: Eye, color: "text-slate-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">لوحة الإدارة</h1>
        <p className="section-subtitle">نظرة عامة على المنصة.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`mb-3 ${color}`}><Icon size={22} /></div>
            <div className="text-3xl font-black dark:text-white">
              {value.toLocaleString("ar-LY")}
            </div>
            <div className="mt-1 text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black dark:text-white">آخر الإعلانات</h2>
          <Link href="/admin/listings" className="btn-ghost text-brand-700 dark:text-brand-300">
            عرض الكل ←
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">لا توجد إعلانات بعد.</p>
          ) : recent.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.images?.[0] || "/icons/car-card.svg"}
                alt={it.title}
                className="h-12 w-16 rounded-xl object-cover bg-slate-100"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black dark:text-white">{it.title}</div>
                <div className="truncate text-xs text-slate-500">
                  {it.city} • {it.category}
                </div>
              </div>
              <span className={
                it.status === "approved" ? "badge-status-approved" :
                it.status === "rejected" ? "badge-status-rejected" :
                "badge-status-pending"
              }>
                {it.status === "approved" ? "معتمد" : it.status === "rejected" ? "مرفوض" : "معلق"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
