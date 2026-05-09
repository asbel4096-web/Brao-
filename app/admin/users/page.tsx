"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Search,
  Shield,
  ShieldOff,
  User as UserIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/utils";

interface UserRow {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  isAdmin?: boolean;
  lastLoginAt?: any;
  createdAt?: any;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      // fallback لو ما عند createdAt على الـ docs القديمة
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
      u.uid?.toLowerCase().includes(s) ||
      u.id?.toLowerCase().includes(s)
    );
  });

  /**
   * منح أو سحب صلاحيات الأدمن.
   * يكتب مباشرة على users/{uid}.isAdmin = bool.
   * هذا هو **الطريق الوحيد** لتعديل صلاحيات الأدمن.
   */
  const toggleAdmin = async (u: UserRow) => {
    if (!currentUser) return;

    if (u.id === currentUser.uid) {
      toast.warning("لا يمكنك سحب صلاحياتك من نفسك.");
      return;
    }

    const next = !u.isAdmin;
    const ok = await confirm({
      title: next ? "منح صلاحيات الإدارة؟" : "سحب صلاحيات الإدارة؟",
      message: next
        ? `سيصبح ${u.name || u.email || "هذا المستخدم"} أدمناً وله صلاحيات كاملة.`
        : `سيتم سحب صلاحيات الإدارة من ${u.name || u.email || "هذا المستخدم"}.`,
      confirmText: next ? "منح الصلاحيات" : "سحب الصلاحيات",
      tone: "danger",
    });
    if (!ok) return;

    try {
      setBusyId(u.id);
      await updateDoc(doc(db, "users", u.id), {
        isAdmin: next,
        updatedAt: serverTimestamp(),
      });
      toast.success(next ? "تم منح الصلاحيات." : "تم سحب الصلاحيات.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحديث الصلاحيات.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">المستخدمون</h1>
        <p className="section-subtitle">
          قائمة بكل المستخدمين المسجّلين. الأدمن مصدر الحقيقة الوحيد:
          حقل <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">isAdmin</code> في وثيقة المستخدم.
        </p>
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
            // ✅ المصدر الوحيد للأدمن
            const isAdmin = u.isAdmin === true;
            const isMe = u.id === currentUser?.uid;
            const isBusy = busyId === u.id;

            return (
              <div key={u.id} className="card flex items-center gap-3 p-4">
                {u.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.photoURL}
                    alt={u.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
                    <UserIcon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-black dark:text-white">
                      {u.name || "بدون اسم"}
                    </div>
                    {isAdmin && (
                      <span className="badge-action !text-[10px]">
                        <Shield size={10} className="ml-1" /> مشرف
                      </span>
                    )}
                    {isMe && (
                      <span className="badge !text-[10px]">أنت</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {u.email || "—"} {u.phone ? `• ${u.phone}` : ""}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-400">
                    آخر دخول: {formatDateTime(u.lastLoginAt)}
                  </div>
                </div>

                {/* زر منح/سحب الأدمن */}
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => void toggleAdmin(u)}
                    disabled={isBusy}
                    className={
                      isAdmin
                        ? "inline-flex shrink-0 items-center gap-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        : "inline-flex shrink-0 items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }
                  >
                    {isAdmin ? (
                      <>
                        <ShieldOff size={13} />
                        <span className="hidden sm:inline">سحب</span>
                      </>
                    ) : (
                      <>
                        <Shield size={13} />
                        <span className="hidden sm:inline">منح أدمن</span>
                      </>
                    )}
                  </button>
                )}

                <div className="hidden font-mono text-[10px] text-slate-400 sm:block">
                  {u.uid?.slice(0, 8)}…
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
        <strong>كيف تُمنح صلاحيات الأدمن؟</strong>
        <ul className="mt-2 space-y-1 list-disc pr-4">
          <li>
            استخدم زر <strong>"منح أدمن"</strong> أعلاه — يكتب مباشرة على
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 dark:bg-slate-900">isAdmin: true</code>.
          </li>
          <li>
            للـ bootstrap الأوّل (لا يوجد أدمن في النظام بعد): أضف الإيميل إلى
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 dark:bg-slate-900">NEXT_PUBLIC_ADMIN_EMAILS</code>{" "}
            ثم سجّل الدخول لأوّل مرة. سيُكتب isAdmin تلقائياً.
          </li>
          <li>
            بعد ذلك، تغيير قائمة env <strong>لا يؤثر</strong> على الأدمن الحاليين.
          </li>
        </ul>
      </div>
    </div>
  );
}
