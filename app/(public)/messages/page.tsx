"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, onSnapshot, orderBy, query, where,
} from "firebase/firestore";
import { MessageCircle, Search, Inbox } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo, truncate } from "@/lib/utils";
import type { ChatThread } from "@/lib/types";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/messages");
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("messages list", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, authLoading, router]);

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const s = search.trim().toLowerCase();
    return chats.filter((chat) => {
      const otherUid = chat.participants.find((p) => p !== user?.uid) || "";
      const otherName = chat.participantsInfo?.[otherUid]?.name?.toLowerCase() || "";
      const title = chat.listingTitle?.toLowerCase() || "";
      const last = chat.lastMessage?.toLowerCase() || "";
      return otherName.includes(s) || title.includes(s) || last.includes(s);
    });
  }, [chats, search, user?.uid]);

  const totalUnread = useMemo(
    () =>
      chats.reduce((sum, c) => sum + (c.unreadCount?.[user?.uid || ""] || 0), 0),
    [chats, user?.uid]
  );

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
      <div className="mx-auto max-w-3xl">
        {/* رأس الصفحة */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="section-title">الرسائل</h1>
              {totalUnread > 0 && (
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-action-500 px-2 text-xs font-black text-white shadow-action">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <p className="section-subtitle">
              دردشاتك مع البائعين والمشترين على المنصة.
            </p>
          </div>
        </div>

        {/* شريط البحث */}
        {chats.length > 0 && (
          <div className="mb-4 relative">
            <Search
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="input pr-10"
              aria-label="بحث في المحادثات"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Inbox size={32} aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
              لا توجد محادثات بعد
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ابدأ محادثة من صفحة أي إعلان لتظهر هنا.
            </p>
            <Link href="/listings" className="btn-primary mt-4 inline-flex">
              تصفح الإعلانات
            </Link>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-600 dark:text-slate-300">
              لا توجد محادثات مطابقة للبحث.
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn-secondary mt-4 inline-flex"
            >
              مسح البحث
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => {
              const otherUid = chat.participants.find((p) => p !== user.uid) || "";
              const other = chat.participantsInfo?.[otherUid];
              const unread = chat.unreadCount?.[user.uid] || 0;
              const hasUnread = unread > 0;
              const lastIsMine = chat.lastSenderId === user.uid;

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className={`
                    group flex items-center gap-3 rounded-3xl border p-3 sm:p-4
                    transition-all
                    ${
                      hasUnread
                        ? "border-brand-300 bg-brand-50/40 shadow-card hover:shadow-blue dark:border-brand-700 dark:bg-brand-900/10"
                        : "border-slate-200/80 bg-white shadow-card hover:border-brand-200 hover:shadow-blue dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-brand-700"
                    }
                  `}
                >
                  {/* صورة الإعلان أو حرف */}
                  <div className="relative shrink-0">
                    {chat.listingImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chat.listingImage}
                        alt={chat.listingTitle}
                        className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 sm:h-16 sm:w-16">
                        <MessageCircle size={22} />
                      </div>
                    )}
                    {/* مؤشر صورة الشخص */}
                    {other?.photoURL && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={other.photoURL}
                        alt=""
                        className="absolute -bottom-1 -left-1 h-6 w-6 rounded-full border-2 border-white object-cover dark:border-slate-900"
                      />
                    )}
                  </div>

                  {/* المحتوى */}
                  <div className="min-w-0 flex-1">
                    {/* السطر العلوي: الاسم + الوقت */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`truncate text-sm sm:text-base ${
                          hasUnread
                            ? "font-black text-slate-900 dark:text-white"
                            : "font-bold text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {other?.name || "مستخدم"}
                      </div>
                      <div
                        className={`shrink-0 text-[11px] sm:text-xs ${
                          hasUnread
                            ? "font-bold text-brand-700 dark:text-brand-300"
                            : "text-slate-500"
                        }`}
                      >
                        {timeAgo(chat.lastMessageAt)}
                      </div>
                    </div>

                    {/* السطر الأوسط: عنوان الإعلان */}
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                      <span className="text-brand-700/80 dark:text-brand-300/80">حول:</span>{" "}
                      {chat.listingTitle}
                    </div>

                    {/* السطر السفلي: آخر رسالة + شارة غير مقروء */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div
                        className={`truncate text-sm ${
                          hasUnread
                            ? "font-bold text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {chat.lastMessage ? (
                          <>
                            {lastIsMine && (
                              <span className="text-slate-400">أنت: </span>
                            )}
                            {truncate(chat.lastMessage, 60)}
                          </>
                        ) : (
                          <span className="italic text-slate-400">
                            ابدأ المحادثة...
                          </span>
                        )}
                      </div>
                      {hasUnread && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-action-500 px-1.5 text-[11px] font-black text-white shadow-action">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
