"use client";

import { useState } from "react";

const seedConversations = [
  {
    id: 1,
    name: "أحمد سالم",
    messages: [
      { from: "them", text: "السلام عليكم، هل السيارة موجودة؟" },
      { from: "me", text: "نعم موجودة، تفضل بالسؤال." }
    ]
  },
  {
    id: 2,
    name: "ورشة الماهر",
    messages: [{ from: "them", text: "هل القطعة متوفرة مع التركيب؟" }]
  },
  {
    id: 3,
    name: "بيت الغيار",
    messages: [{ from: "them", text: "نبي نتأكد من السعر النهائي." }]
  }
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0].id);
  const [text, setText] = useState("");

  const active = conversations.find((item) => item.id === activeId) || conversations[0];

  const sendMessage = () => {
    const value = text.trim();
    if (!value) return;
    setConversations((prev) => prev.map((item) => item.id === activeId ? { ...item, messages: [...item.messages, { from: "me", text: value }] } : item));
    setText("");
  };

  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="card p-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">دردشاتي</h2>
          <div className="mt-4 space-y-3">
            {conversations.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`w-full rounded-2xl border p-4 text-right ${activeId === item.id ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20" : "border-slate-200 dark:border-white/10"}`}>
                <div className="font-black text-slate-900 dark:text-white">{item.name}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.messages[item.messages.length - 1]?.text}</div>
              </button>
            ))}
          </div>
        </aside>
        <div className="card flex min-h-[520px] flex-col p-4">
          <div className="border-b border-slate-200 pb-4 dark:border-white/10">
            <div className="text-xl font-black text-slate-900 dark:text-white">{active.name}</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">دردشة جاهزة للربط لاحقًا مع Firestore</div>
          </div>
          <div className="flex-1 space-y-4 py-6">
            {active.messages.map((message, index) => (
              <div key={index} className={`${message.from === "me" ? "mr-auto bg-brand-600 text-white rounded-tl-md" : "bg-slate-100 text-slate-700 rounded-tr-md dark:bg-slate-800 dark:text-slate-100"} max-w-md rounded-3xl p-4 text-sm`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="mt-auto grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" placeholder="اكتب رسالتك..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
            <button className="btn-primary" type="button" onClick={sendMessage}>إرسال</button>
          </div>
        </div>
      </div>
    </section>
  );
}
