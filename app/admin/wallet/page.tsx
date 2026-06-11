"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Wallet as WalletIcon,
  Search,
  TrendingUp,
  Users as UsersIcon,
  Coins,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { formatBC } from "@/lib/wallet/types";

/**
 * صفحة إدارة المحافظ.
 *
 * - يعرض المستخدمين الأعلى رصيداً (top 50)
 * - بحث (client-side)
 * - الضغط على مستخدم → /admin/wallet/[uid]
 *
 * ملاحظة: لا نُنشئ index على balance لأن قد لا يكون كل المستخدمين
 * لديهم الحقل. نقرأ مرتَّبين حسب createdAt وindex client-side.
 * لمنصات أكبر: نُنشئ field-specific query لاحقاً.
 */

interface UserSummary {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  balance?: number;
  walletUpdatedAt?: any;
}

export default function AdminWalletPage() {
  const { can } = useAdminRole();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        // نقرأ آخر 200 مستخدم بتاريخ الإنشاء (cap لتجنّب reads زائدة)
        const snap = await getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(200)
          )
        );
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as UserSummary[];
        // فلتر: نُبقي فقط من له balance > 0 + نُرتّب
        const withBalance = list
          .filter((u) => typeof u.balance === "number")
          .sort((a, b) => (b.balance || 0) - (a.balance || 0));
        setUsers(withBalance);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[admin-wallet]", err?.code);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة المحافظ.
      </div>
    );
  }

  // Filter
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const usersWithBalance = users.filter((u) => (u.balance || 0) > 0).length;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
          <WalletIcon size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            إدارة المحافظ
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            عرض الأرصدة + إضافة/خصم يدوي.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBox
          label="إجمالي الأرصدة"
          value={formatBC(totalBalance)}
          icon={Coins}
          tone="action"
        />
        <StatBox
          label="مستخدمون لديهم رصيد"
          value={String(usersWithBalance)}
          icon={UsersIcon}
          tone="brand"
        />
        <StatBox
          label="إجمالي مستخدمين"
          value={String(users.length)}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، البريد، الهاتف..."
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white pe-10 ps-3 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <WalletIcon size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {search ? "لا نتائج للبحث" : "لا يوجد مستخدمون برصيد بعد"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Link
              key={u.id}
              href={`/admin/wallet/${u.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-action-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-action-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-black text-white">
                {(u.name || u.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {u.name || u.email || u.id}
                </p>
                {u.email && (
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400" dir="ltr">
                    {u.email}
                  </p>
                )}
              </div>
              <div className="text-end">
                <p className="text-base font-black tabular-nums text-action-600 dark:text-action-400">
                  {(u.balance || 0).toLocaleString("ar-LY")}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  BC
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "action" | "brand" | "emerald";
}) {
  const tones = {
    action: "bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
