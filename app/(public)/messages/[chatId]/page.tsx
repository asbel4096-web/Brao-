"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { ArrowRight, Send, MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createNotification } from "@/lib/notifications";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { ChatMessage, ChatThread } from "@/lib/types";

export default function ChatRoomPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();

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

        try {
          await updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
        } catch {/* تحديث غير المقروء ليس حرجاً */}

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

      await updateDoc(doc(db, "chats", params.chatId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        [`unreadCount.${otherUid}`]: increment(1),
      });

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
      toast.error(err?.message || "تعذّر إرسال الرسالة.");
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
          <p className="font-bold text-rose-700">{error}</p>
          <Link href="/messages" className="btn-secondary mt-4">العودة للمحادثات</Link>
        </div>
      </section>
    );
  }

  if (!thread || !user) return null;

  const otherUid = thread.participants.find((p) => p !== user.uid) || "";
  const other = thread.participantsInfo?.[otherUid];

  const groupedMessages = groupMessagesByDay(messages);

  return (
    <section className="container py-4 sm:py-6">
      <div className="mx-auto flex max-w-3xl flex-col h-[calc(100dvh-180px)] sm:h-[calc(100dvh-160px)]">
        <div className="flex items-center gap-3 rounded-3xl rounded-b-none border border-b-0 border-slate-200/80 bg-white p-3 shadow-card dark:border-slate-700/80 dark:bg-slate-900 sm:p-4">
          <Link
            href="/messages"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="رجوع"
          >
            <ArrowRight size={20} />
          </Link>

          {other?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={other.photoURL}
              alt={other.name}
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-sm font-black text-white shadow-blue">
              {(other?.name || "م").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
              {other?.name || "مستخدم"}
            </div>
            <Link
              href={`/listings/${thread.listingId}`}
              className="block truncate text-xs text-brand-700 hover:underline dark:text-brand-300"
            >
              حول: {thread.listingTitle}
            </Link>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto border-x border-slate-200/80 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-950 sm:p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <MessageCircle size={32} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                ابدأ المحادثة بإرسال أول رسالة...
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedMessages.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      {group.label}
                    </span>
                  </div>

                  {group.items.map((m, idx) => {
                    const mine = m.senderId === user.uid;
                    const prev = group.items[idx - 1];
                    const isFirstOfRun = !prev || prev.senderId !== m.senderId;

                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`
                            max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:px-4 sm:py-2.5
                            ${
                              mine
                                ? `bg-brand-700 text-white ${isFirstOfRun ? "rounded-tr-md" : ""}`
                                : `border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${isFirstOfRun ? "rounded-tl-md" : ""}`
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {m.text}
                          </p>
                          <div
                            className={`mt-1 text-[10px] ${
                              mine ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {timeAgo(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 rounded-3xl rounded-t-none border border-t-0 border-slate-200/80 bg-white p-3 shadow-card dark:border-slate-700/80 dark:bg-slate-900"
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
            className="input min-h-[44px] max-h-32 flex-1 resize-none !py-2.5"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-action shrink-0 !px-4 !py-3"
            aria-label="إرسال"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

function groupMessagesByDay(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  let lastKey = "";

  for (const m of messages) {
    const date = m.createdAt?.toDate?.();
    let key: string;
    let label: string;
    if (!date) {
      key = "now";
      label = "الآن";
    } else {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        key = "today";
        label = "اليوم";
      } else if (isYesterday) {
        key = "yesterday";
        label = "أمس";
      } else {
        key = date.toDateString();
        label = formatDateTime(m.createdAt as any).split("،")[0] || key;
      }
    }

    if (key !== lastKey) {
      groups.push({ label, items: [m] });
      lastKey = key;
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }

  return groups;
}
