"use client";

import { useState } from "react";

type Conversation = {
  id: number;
  title: string;
  subtitle: string;
  unread?: number;
};

const conversations: Conversation[] = [
  {
    id: 1,
    title: "عميل مهتم بسيارة E350",
    subtitle: "أهلاً، هل السيارة ما زالت متوفرة؟",
    unread: 2
  },
  {
    id: 2,
    title: "استفسار عن قطع غيار كهربائية",
    subtitle: "محتاج حساس ABS لسيارة كيا"
  },
  {
    id: 3,
    title: "عميل يسأل عن ميكانيكي متنقل",
    subtitle: "هل عندكم خدمة داخل طرابلس؟"
  }
];

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<number>(1);

  const selectedConversation =
    conversations.find((item) => item.id === selectedId) || conversations[0];

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900">الدردشة</h1>
          <p className="mt-2 text-slate-500">
            واجهة رسائل احترافية مبدئية، ويمكن ربطها لاحقًا برسائل حقيقية عبر Firestore.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[340px_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 text-xl font-black text-slate-900">
              المحادثات
            </div>

            <div className="space-y-3">
              {conversations.map((item) => {
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-right transition ${
                      active
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.subtitle}
                        </div>
                      </div>

                      {item.unread ? (
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-500 px-2 text-xs font-black text-white">
                          {item.unread}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-2xl font-black text-slate-900">
                {selectedConversation.title}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                محادثة تجريبية قابلة للتطوير لاحقًا
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-slate-100 px-4 py-3 text-slate-800">
                  السلام عليكم، هل الإعلان ما زال متوفر؟
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-3xl rounded-tl-md bg-blue-600 px-4 py-3 text-white">
                  نعم، متوفر. تفضل بأي استفسار.
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-slate-100 px-4 py-3 text-slate-800">
                  ممكن آخر سعر ومكان المعاينة؟
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">
                هذه واجهة جاهزة الآن، ويمكن تحويلها لاحقًا إلى دردشة مباشرة بين البائع والمشتري.
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="اكتب رسالتك هنا"
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                />
                <button
                  type="button"
                  className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-white"
                >
                  إرسال
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
