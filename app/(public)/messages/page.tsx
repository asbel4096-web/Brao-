"use client";

import { useMemo, useState } from "react";
import {
  Search,
  SendHorizonal,
  Image as ImageIcon,
  Phone,
  MoreVertical,
  CircleUserRound
} from "lucide-react";

type Conversation = {
  id: string;
  name: string;
  listingTitle: string;
  lastMessage: string;
  time: string;
  unread?: number;
};

type Message = {
  id: string;
  sender: "me" | "other";
  text: string;
  time: string;
};

const conversations: Conversation[] = [
  {
    id: "1",
    name: "محمد علي",
    listingTitle: "مرسيدس E350 2014",
    lastMessage: "هل السيارة ما زالت متوفرة؟",
    time: "10:25",
    unread: 2
  },
  {
    id: "2",
    name: "سالم",
    listingTitle: "هيونداي أزيرا 2012",
    lastMessage: "وين مكان المعاينة؟",
    time: "أمس"
  },
  {
    id: "3",
    name: "أحمد",
    listingTitle: "قطع غيار هيونداي",
    lastMessage: "عندك شحن للزاوية؟",
    time: "الأحد"
  }
];

const conversationMessages: Record<string, Message[]> = {
  "1": [
    { id: "m1", sender: "other", text: "السلام عليكم", time: "10:20" },
    { id: "m2", sender: "other", text: "هل السيارة ما زالت متوفرة؟", time: "10:21" },
    { id: "m3", sender: "me", text: "وعليكم السلام، نعم متوفرة.", time: "10:22" },
    { id: "m4", sender: "other", text: "قداش آخر سعر؟", time: "10:25" }
  ],
  "2": [
    { id: "m5", sender: "other", text: "وين مكان المعاينة؟", time: "أمس" },
    { id: "m6", sender: "me", text: "طرابلس، أبو سليم.", time: "أمس" }
  ],
  "3": [
    { id: "m7", sender: "other", text: "عندك شحن للزاوية؟", time: "الأحد" },
    { id: "m8", sender: "me", text: "نعم متوفر حسب الاتفاق.", time: "الأحد" }
  ]
};

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "1");
  const [draft, setDraft] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const q = search.trim();
      if (!q) return true;
      return (
        item.name.includes(q) ||
        item.listingTitle.includes(q) ||
        item.lastMessage.includes(q)
      );
    });
  }, [search]);

  const activeConversation =
    filteredConversations.find((item) => item.id === activeId) ||
    conversations.find((item) => item.id === activeId) ||
    conversations[0];

  const activeMessages = activeConversation
    ? conversationMessages[activeConversation.id] || []
    : [];

  return (
    <section className="container pb-8">
      <div className="grid gap-5 md:grid-cols-[340px_1fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            {filteredConversations.length === 0 ? (
              <div className="rounded-[20px] bg-slate-50 px-4 py-8 text-center text-base font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                لا توجد محادثات مطابقة.
              </div>
            ) : (
              filteredConversations.map((item) => {
                const active = item.id === activeId;

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
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">{item.time}</span>
                          <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {item.name}
                          </h2>
                        </div>

                        <div className="mt-1 text-sm font-bold text-[#2F49C8]">
                          {item.listingTitle}
                        </div>

                        <div className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-slate-300">
                          {item.lastMessage}
                        </div>
                      </div>

                      {item.unread ? (
                        <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F58233] px-2 text-xs font-black text-white">
                          {item.unread}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <button className="rounded-xl p-2 text-slate-500 dark:text-slate-300">
                  <MoreVertical className="h-5 w-5" />
                </button>

                <div className="text-right">
                  <div className="text-xl font-black text-slate-950 dark:text-white">
                    {activeConversation.name}
                  </div>
                  <div className="mt-1 text-sm text-[#2F49C8]">
                    {activeConversation.listingTitle}
                  </div>
                </div>

                <button className="rounded-xl p-2 text-slate-500 dark:text-slate-300">
                  <Phone className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3 bg-slate-50 px-4 py-5 dark:bg-slate-950 min-h-[420px]">
                {activeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "me" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[20px] px-4 py-3 text-right shadow-sm ${
                        msg.sender === "me"
                          ? "bg-[#2F49C8] text-white"
                          : "bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                      }`}
                    >
                      <div className="text-base leading-8">{msg.text}</div>
                      <div
                        className={`mt-2 text-xs ${
                          msg.sender === "me"
                            ? "text-white/70"
                            : "text-slate-400"
                        }`}
                      >
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <input
                    type="text"
                    placeholder="اكتب رسالتك..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-right outline-none dark:border-slate-700 dark:bg-slate-950"
                  />

                  <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58233] text-white shadow-[0_10px_24px_rgba(245,130,51,0.24)]">
                    <SendHorizonal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-300">
              اختر محادثة لعرض الرسائل.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
