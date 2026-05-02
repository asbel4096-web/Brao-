"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Search, User as UserIcon, Shield } from "lucide-react";
import { db, isAdminEmail } from "@/lib/firebase";
import { formatDateTime } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      // fallback if no createdAt field
      () => {
        const unsub2 = onSnapshot(collection(db, "users"), (snap) => {
          setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          setLoading(false);
        });
        return unsub2;
      }
    );
    return () => unsub();
  }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.includes(s) ||
      u.uid?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">المستخدمون</h1>
        <p className="section-subtitle">قائمة بكل المستخدمين المسجّلين.</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pr-10"
          placeholder="ابحث بالاسم أو البريد أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">لا يوجد مستخدمون.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const admin = u.isAdmin || isAdminEmail(u.email);
            return (
              <div key={u.id} className="card flex items-center gap-3 p-4">
                {u.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.photoURL} alt={u.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white">
                    <UserIcon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-black dark:text-white">
                      {u.name || "بدون اسم"}
                    </div>
                    {admin && (
                      <span className="badge-action !text-[10px]">
                        <Shield size={10} className="ml-1" /> مشرف
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {u.email || "—"} {u.phone ? `• ${u.phone}` : ""}
                  </div>
                  <div className="truncate text-[11px] text-slate-400 mt-0.5">
                    آخر دخول: {formatDateTime(u.lastLoginAt)}
                  </div>
                </div>
                <div className="hidden sm:block text-[10px] text-slate-400 font-mono">
                  {u.uid?.slice(0, 10)}...
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-900/20 dark:border-amber-700/40 dark:text-amber-200">
        ملاحظة: لمنح صلاحيات مشرف لمستخدم، أضف بريده إلى متغير
        <code className="mx-1 rounded bg-white px-2 py-0.5 dark:bg-slate-900">NEXT_PUBLIC_ADMIN_EMAILS</code>
        أو حدّث حقل <code className="mx-1 rounded bg-white px-2 py-0.5 dark:bg-slate-900">isAdmin: true</code> في وثيقة المستخدم.
      </div>
    </div>
  );
}
