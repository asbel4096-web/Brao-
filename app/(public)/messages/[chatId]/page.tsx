"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { ArrowRight, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/lib/notifications";
import { timeAgo } from "@/lib/utils";
import type { ChatMessage, ChatThread } from "@/lib/types";

export default function ChatRoomPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/messages");
      return;
    }
    let unsubMessages: (() => void) | null = null;
    let unsubThread: (() => void) | null = null;

    const init = async () => {
      try {
        const chatRef = doc(db, "chats", params.chatId);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
          setError("المحادثة غير موجودة.");
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as any) } as ChatThread;
        if (!data.participants.includes(user.uid)) {
          setError("ليس لديك صلاحية فتح هذه المحادثة.");
          setLoading(false);
          return;
        }
        setThread(data);

        // mark unread = 0 for me
        try {
          await updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
        } catch {/* ok */}

        unsubThread = onSnapshot(chatRef, (s) => {
          if (s.exists()) setThread({ id: s.id, ...(s.data() as any) });
        });

        const q = query(
          collection(db, "chats", params.chatId, "messages"),
          orderBy("createdAt", "asc")
        );
        unsubMessages = onSnapshot(q, (qs) => {
          const arr: ChatMessage[] = qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setMessages(arr);
          setLoading(false);
          // auto-scroll
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }, 100);
        });
      } catch (err: any) {
        setError(err?.message || "تعذّر فتح المحادثة.");
        setLoading(false);
      }
    };

    void init();
    return () => {
      unsubMessages?.();
      unsubThread?.();
    };
  }, [user, authLoading, params.chatId, router]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !thread) return;
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const otherUid = thread.participants.find((p) => p !== user.uid) || "";

      // 1) push message
      await addDoc(collection(db, "chats", params.chatId, "messages"), {
        text: content,
        senderId: user.uid,
        senderName:
          profile?.name ||
          user.displayName ||
          user.email ||
          user.phoneNumber ||
          "مستخدم",
        createdAt: serverTimestamp(),
        read: false,
      });

      // 2) update thread (last message + unread for the other)
      await updateDoc(doc(db, "chats", params.chatId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        [`unreadCount.${otherUid}`]: increment(1),
      });

      // 3) notification for the other user
      await createNotification({
        userId: otherUid,
        type: "new_message",
        title: "رسالة جديدة",
        body: `${profile?.name || "مستخدم"}: ${content.slice(0, 80)}`,
        link: `/messages/${params.chatId}`,
        meta: { chatId: params.chatId, listingId: thread.listingId },
      });

      setText("");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("send message", err);
      alert(err?.message || "تعذّر إرسال الرسالة.");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-rose-700 font-bold">{error}</p>
          <Link href="/messages" className="btn-secondary mt-4">العودة للمحادثات</Link>
        </div>
      </section>
    );
  }

  if (!thread || !user) return null;

  const otherUid = thread.participants.find((p) => p !== user.uid) || "";
  const other = thread.participantsInfo?.[otherUid];

  return (
    <section className="container py-4 sm:py-6">
      <div className="mx-auto flex max-w-3xl flex-col h-[calc(100dvh-180px)] sm:h-[calc(100dvh-160px)]">
        {/* Header */}
        <div className="card flex items-center gap-3 rounded-b-none p-3 sm:p-4">
          <Link href="/messages" className="btn-ghost !px-2" aria-label="رجوع">
            <ArrowRight size={20} />
          </Link>
          {other?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.photoURL} alt={other.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-black text-white">
              {(other?.name || "م").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black dark:text-white">
              {other?.name || "مستخدم"}
            </div>
            <Link
              href={`/listings/${thread.listingId}`}
              className="truncate block text-xs text-brand-700 dark:text-brand-300 hover:underline"
            >
              حول: {thread.listingTitle}
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto border-x border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              ابدأ المحادثة بإرسال أول رسالة...
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const mine = m.senderId === user.uid;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine
                          ? "bg-brand-700 text-white rounded-tr-md"
                          : "bg-white text-slate-900 rounded-tl-md border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <div
                        className={`mt-1 text-[10px] ${
                          mine ? "text-white/70" : "text-slate-500"
                        }`}
                      >
                        {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="card flex items-end gap-2 rounded-t-none p-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            placeholder="اكتب رسالتك..."
            rows={1}
            className="input min-h-[44px] max-h-32 resize-none flex-1 !py-2.5"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-action !px-4 !py-3 shrink-0"
            aria-label="إرسال"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
