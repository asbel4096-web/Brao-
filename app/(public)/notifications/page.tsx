"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import {
  Bell, CheckCheck, MessageCircle, Check, X, Trash2, AlertCircle,
  UserPlus, Heart, Star,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { PushPermissionBanner } from "@/components/push-permission-banner";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/notifications");
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user, authLoading, router]);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch {/* تحديث القراءة ليس حرجاً */}
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err: any) {
      toast.error(err?.message || "تعذّر حذف الإشعار.");
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    try {
      await batch.commit();
      toast.success("تم تعليم كل الإشعارات كمقروءة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحديث الإشعارات.");
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

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <section className="container py-6 pb-28 sm:py-10 sm:pb-32">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Bell /> الإشعارات
            </h1>
            <p className="section-subtitle">
              {unreadCount > 0
                ? `${unreadCount.toLocaleString("ar-LY")} غير مقروء`
                : "كل الإشعارات مقروءة"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary self-start sm:self-end">
              <CheckCheck size={16} /> تعليم الكل كمقروء
            </button>
          )}
        </div>

        {/* بانر تفعيل الإشعارات (Push). يخفي نفسه تلقائياً عند:
            - الإذن ممنوح (compact mode لا يعرض granted)
            - المتصفح غير مدعوم
            - المستخدم رفضه عبر زر "ليس الآن"
            متى يظهر: عند default/needs-pwa/denied/error. */}
        <PushPermissionBanner variant="compact" dismissible />

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Bell size={32} />
            </div>
            <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
              لا توجد إشعارات بعد
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ستظهر هنا التحديثات عن إعلاناتك ورسائلك.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon =
                n.type === "new_message" ? MessageCircle :
                n.type === "listing_approved" ? Check :
                n.type === "listing_rejected" ? X :
                n.type === "new_follower" ? UserPlus :
                n.type === "new_like" ? Heart :
                n.type === "new_comment" ? MessageCircle :
                n.type === "new_review" ? Star :
                n.type === "search_alert_match" ? Bell :
                AlertCircle;
              const tone =
                n.type === "listing_approved" ? "text-emerald-700 dark:text-emerald-300" :
                n.type === "listing_rejected" ? "text-rose-700 dark:text-rose-300" :
                n.type === "new_like" ? "text-rose-600 dark:text-rose-300" :
                n.type === "new_review" ? "text-amber-600 dark:text-amber-300" :
                n.type === "search_alert_match" ? "text-action-600 dark:text-action-300" :
                "text-brand-700 dark:text-brand-300";
              const iconBg =
                n.type === "listing_approved" ? "bg-emerald-50 dark:bg-emerald-900/30" :
                n.type === "listing_rejected" ? "bg-rose-50 dark:bg-rose-900/30" :
                n.type === "new_like" ? "bg-rose-50 dark:bg-rose-900/30" :
                n.type === "new_review" ? "bg-amber-50 dark:bg-amber-900/30" :
                n.type === "search_alert_match" ? "bg-action-50 dark:bg-action-900/30" :
                "bg-brand-50 dark:bg-brand-900/30";

              return (
                <div
                  key={n.id}
                  className={`card p-4 transition ${
                    !n.read
                      ? "border-brand-300 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-900/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${tone}`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm dark:text-white ${
                            !n.read ? "font-black" : "font-bold"
                          }`}
                        >
                          {n.title}
                        </h3>
                        <span className="shrink-0 text-xs text-slate-500">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {n.body}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => markRead(n.id)}
                            className="btn-ghost !px-2 !py-1 !text-xs"
                          >
                            فتح
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="btn-ghost !px-2 !py-1 !text-xs"
                          >
                            <Check size={12} /> مقروء
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(n.id)}
                          className="btn-ghost !px-2 !py-1 !text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        >
                          <Trash2 size={12} /> حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
