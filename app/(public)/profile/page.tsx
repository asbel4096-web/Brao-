"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where
} from "firebase/firestore";
import {
  Search,
  SendHorizonal,
  Image as ImageIcon,
  Phone,
  MoreVertical,
  CircleUserRound
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { sendMessage } from "@/lib/chat";

type ConversationItem = {
  id: string;
  participantIds: string[];
  participantNames?: Record<string, string>;
  listingId?: string;
  listingTitle?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
};

type MessageItem = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: any;
};

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const requestedConversation = searchParams.get("conversation");

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setLoadingConversations(false);
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", currentUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: ConversationItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ConversationItem, "id">)
        }));

        rows.sort((a, b) => {
          const aTime = a.lastMessageAt?.seconds || 0;
          const bTime = b.lastMessageAt?.seconds || 0;
          return bTime - aTime;
        });

        setConversations(rows);

        if (requestedConversation) {
          setActiveId(requestedConversation);
        } else if (!activeId && rows.length > 0) {
          setActiveId(rows[0].id);
        }

        if (rows.length === 0) {
          setActiveId("");
        }

        setLoadingConversations(false);
      },
      (error) => {
        console.error("Conversations error:", error);
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid, activeId, requestedConversation]);

  useEffect(() => {
    if (requestedConversation) {
      setActiveId(requestedConversation);
    }
  }, [requestedConversation]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: MessageItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MessageItem, "id">)
        }));
        setMessages(rows);
      },
      (error) => {
        console.error("Messages error:", error);
      }
    );

    return () => unsubscribe();
  }, [activeId]);

  const filteredConversations = useMemo(() => {
    const q = search.trim();
    if (!q) return conversations;

    return conversations.filter((item) => {
      const otherName =
        item.participantNames?.[
          item.participantIds.find((id) => id !== currentUid) || ""
        ] || "مستخدم";

      return (
        otherName.includes(q) ||
        (item.listingTitle || "").includes(q) ||
        (item.lastMessage || "").includes(q)
      );
    });
  }, [search, conversations, currentUid]);

  const activeConversation =
    filteredConversations.find((item) => item.id === activeId) ||
    conversations.find((item) => item.id === activeId);

  const otherUserId = activeConversation?.participantIds.find(
    (id) => id !== currentUid
  );

  const otherUserName =
    activeConversation?.participantNames?.[otherUserId || ""] || "مستخدم";

  const handleSend = async () => {
    if (!currentUid || !activeId || !draft.trim()) return;

    try {
      setSending(true);
      await sendMessage(activeId, currentUid, draft);
      setDraft("");
    } catch (error) {
      console.error("Send message error:", error);
      alert("تعذر إرسال الرسالة.");
    } finally {
      setSending(false);
    }
  };

  if (!currentUid) {
    return (
      <section className="container pb-32">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          يجب تسجيل الدخول أولًا لعرض المحادثات.
        </div>
      </section>
    );
  }

  return (
    <section className="container pb-32">
      <div className="grid gap-5 md:grid-cols-[340px_1fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">
              الدردشة
            </h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {conversations.length}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث في المحادثات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-right text-base outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mt-4 grid gap-3">
            {loadingConversations ? (
              <div className="rounded-[20px] bg-slate-50 px-4 py-8 text-center text-base font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                جارٍ تحميل المحادثات...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-[20px] bg-slate-50 px-4 py-8 text-center text-base font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                لا توجد محادثات بعد.
              </div>
            ) : (
              filteredConversations.map((item) => {
                const active = item.id === activeId;
                const name =
                  item.participantNames?.[
                    item.participantIds.find((id) => id !== currentUid) || ""
                  ] || "مستخدم";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`rounded-[22px] border px-4 py-4 text-right transition ${
                      active
                        ? "border-[#2F49C8] bg-blue-50 dark:border-blue-500 dark:bg-slate-800"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                        <CircleUserRound className="h-7 w-7 text-slate-500 dark:text-slate-300" />
                      </div>

                      <div className="flex-1 text-right">
                        <div className="text-lg font-black text-slate-950 dark:text-white">
                          {name}
                        </div>

                        <div className="mt-1 text-sm font-bold text-[#2F49C8]">
                          {item.listingTitle || "بدون إعلان"}
                        </div>

                        <div className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-slate-300">
                          {item.lastMessage || "ابدأ المحادثة"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-500 dark:text-slate-300"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                <div className="text-right">
                  <div className="text-xl font-black text-slate-950 dark:text-white">
                    {otherUserName}
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#2F49C8]">
                    {activeConversation.listingTitle || "محادثة"}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-500 dark:text-slate-300"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>

              <div className="grid min-h-[460px] gap-3 bg-slate-50 px-4 py-5 dark:bg-slate-950">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center text-center text-base font-bold text-slate-400">
                    لا توجد رسائل بعد، ابدأ المحادثة الآن.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderId === currentUid ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-[20px] px-4 py-3 text-right shadow-sm ${
                          msg.senderId === currentUid
                            ? "bg-[#2F49C8] text-white"
                            : "bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                        }`}
                      >
                        <div className="text-base leading-8">{msg.text}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <input
                    type="text"
                    placeholder="اكتب رسالتك..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-right outline-none dark:border-slate-700 dark:bg-slate-950"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58233] text-white shadow-[0_10px_24px_rgba(245,130,51,0.24)] disabled:opacity-60"
                  >
                    <SendHorizonal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[560px] items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-300">
              اختر محادثة لعرض الرسائل.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <section className="container pb-32">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            جارٍ تحميل الدردشة...
          </div>
        </section>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
