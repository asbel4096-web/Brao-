"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Inbox, MessageCircle, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo, truncate } from "@/lib/utils";
import type { ChatThread } from "@/lib/types";

/**
 * صفحة الرسائل - أُعيد تنظيمها:
 *
 * - شريط البحث يظهر فقط عند ≥ 5 محادثات (تجنب hإهدار)
 * - بطاقة محادثة مبسطة: صورة الشخص + اسم + آخر رسالة + شارة غير مقروء
 *   (إزالة "حول:" وصورة الإعلان المضاعفة - تشتيت بصري)
 * - عنوان الإعلان كـ chip صغير في الأسفل (ليس وسط البطاقة)
 * - Empty state موجَّه للإجراء التالي (تصفّح الإعلانات)
 */

const SEARCH_THRESHOLD = 5;

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
      const otherName =
        chat.participantsInfo?.[otherUid]?.name?.toLowerCase() || "";
      const title = chat.listingTitle?.toLowerCase() || "";
      const last = chat.lastMessage?.toLowerCase() || "";
      return otherName.includes(s) || title.includes(s) || last.includes(s);
    });
  }, [chats, search, user?.uid]);

  const totalUnread = useMemo(
    () =>
      chats.reduce(
        (sum, c) => sum + (c.unreadCount?.[user?.uid || ""] || 0),
        0
      ),
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

  const showSearch = chats.length >= SEARCH_THRESHOLD;

  return (
    <section className="container py-4 sm:py-8">
      <div className="mx-auto max-w-2xl">
        {/* ============== Header ============== */}
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            الرسائل
          </h1>
          {totalUnread > 0 && (
            <span
              className="
                inline-flex h-6 min-w-[24px] items-center justify-center
                rounded-full bg-action-500 px-2 text-xs font-black text-white
                shadow-action
              "
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>

        {/* ============== شريط البحث (فقط لو ≥ 5 محادثات) ============== */}
        {showSearch && (
          <div className="relative mb-4">
            <Search
              size={16}
              className="
                pointer-events-none absolute right-3 top-1/2
                -translate-y-1/2 text-slate-400
              "
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

        {/* ============== المحتوى ============== */}
        {loading ? (
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <EmptyState />
        ) : filteredChats.length === 0 ? (
          <NoSearchResults onClear={() => setSearch("")} />
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} userId={user.uid} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
 * Chat row - مبسطة مقارنة بالسابقة
 * ============================================================ */

function ChatRow({
  chat,
  userId,
}: {
  chat: ChatThread;
  userId: string;
}) {
  const otherUid = chat.participants.find((p) => p !== userId) || "";
  const other = chat.participantsInfo?.[otherUid];
  const unread = chat.unreadCount?.[userId] || 0;
  const hasUnread = unread > 0;
  const lastIsMine = chat.lastSenderId === userId;

  return (
    <Link
      href={`/messages/${chat.id}`}
      prefetch={false}
      className={`
        flex items-center gap-3 rounded-2xl border p-3
        transition-all active:scale-[0.99]
        ${
          hasUnread
            ? "border-brand-300 bg-brand-50/40 hover:bg-brand-50/60 dark:border-brand-700 dark:bg-brand-900/15"
            : "border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-brand-700"
        }
      `}
    >
      {/* صورة الشخص (وليس الإعلان) */}
      {other?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={other.photoURL}
          alt={other.name}
          referrerPolicy="no-referrer"
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
        />
      ) : (
        <div
          className="
            flex h-12 w-12 shrink-0 items-center justify-center
            rounded-full bg-gradient-to-br from-brand-700 to-brand-500
            text-base font-black text-white
          "
        >
          {(other?.name || "م").charAt(0).toUpperCase()}
        </div>
      )}

      {/* المحتوى */}
      <div className="min-w-0 flex-1">
        {/* السطر العلوي: الاسم + الوقت */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm sm:text-base ${
              hasUnread
                ? "font-black text-slate-900 dark:text-white"
                : "font-bold text-slate-800 dark:text-slate-100"
            }`}
          >
            {other?.name || "مستخدم"}
          </span>
          <span
            className={`shrink-0 text-[10px] sm:text-[11px] ${
              hasUnread
                ? "font-bold text-brand-700 dark:text-brand-300"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {timeAgo(chat.lastMessageAt)}
          </span>
        </div>

        {/* السطر الأوسط: آخر رسالة */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={`truncate text-xs sm:text-sm ${
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
              <span className="italic text-slate-400">ابدأ المحادثة...</span>
            )}
          </span>
          {hasUnread && (
            <span
              className="
                flex h-5 min-w-[20px] shrink-0 items-center justify-center
                rounded-full bg-action-500 px-1.5
                text-[10px] font-black text-white shadow-action
              "
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>

        {/* السطر السفلي: chip صغير لعنوان الإعلان (إذا موجود) */}
        {chat.listingTitle && (
          <div className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span className="truncate">{chat.listingTitle}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="skeleton h-12 w-12 shrink-0 !rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div
        className="
          mx-auto flex h-16 w-16 items-center justify-center rounded-2xl
          bg-brand-50 text-brand-700
          dark:bg-brand-900/40 dark:text-brand-300
        "
      >
        <Inbox size={32} aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
        لا توجد محادثات بعد
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        ابدأ محادثة من صفحة أي إعلان لتظهر هنا.
      </p>
      <Link href="/listings" className="btn-primary mt-5 inline-flex">
        <MessageCircle size={16} />
        تصفّح الإعلانات
      </Link>
    </div>
  );
}

function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        لا توجد محادثات مطابقة للبحث.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="btn-secondary mt-4 inline-flex"
      >
        مسح البحث
      </button>
    </div>
  );
}
