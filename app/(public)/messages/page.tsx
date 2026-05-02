"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, onSnapshot, orderBy, query, where,
} from "firebase/firestore";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo, truncate } from "@/lib/utils";
import type { ChatThread } from "@/lib/types";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <h1 className="section-title">الرسائل</h1>
          <p className="section-subtitle">
            دردشاتك مع البائعين والمشترين على المنصة.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="card p-10 text-center">
            <MessageCircle size={48} className="mx-auto text-slate-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              لا توجد محادثات بعد.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              ابدأ محادثة من صفحة أي إعلان.
            </p>
            <Link href="/listings" className="btn-primary mt-4 inline-flex">
              تصفح الإعلانات
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const otherUid = chat.participants.find((p) => p !== user.uid) || "";
              const other = chat.participantsInfo?.[otherUid];
              const unread = chat.unreadCount?.[user.uid] || 0;
              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-blue"
                >
                  {chat.listingImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={chat.listingImage}
                      alt={chat.listingTitle}
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      <MessageCircle size={22} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {other?.name || "مستخدم"}
                      </div>
                      <div className="text-xs text-slate-500 shrink-0">
                        {timeAgo(chat.lastMessageAt)}
                      </div>
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      حول: {chat.listingTitle}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="truncate text-sm text-slate-700 dark:text-slate-300">
                        {chat.lastMessage ? truncate(chat.lastMessage, 50) : "ابدأ المحادثة..."}
                      </div>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-action-500 px-1.5 text-[10px] font-black text-white shrink-0">
                          {unread > 9 ? "9+" : unread}
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
