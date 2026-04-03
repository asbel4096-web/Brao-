"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  const [notifyChats, setNotifyChats] = useState(true);
  const [notifyListings, setNotifyListings] = useState(true);

  useEffect(() => {
    const chats = localStorage.getItem("brao-notify-chats");
    const listings = localStorage.getItem("brao-notify-listings");
    if (chats !== null) setNotifyChats(chats === "1");
    if (listings !== null) setNotifyListings(listings === "1");
  }, []);

  const saveToggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, value ? "1" : "0");
  };

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="section-title">الإعدادات</h1>
          <p className="section-subtitle">تحكم في الوضع الليلي والإشعارات الأساسية داخل التطبيق.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">المظهر</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">بدّل بين الوضع النهاري والوضع الليلي.</p>
            <div className="mt-5 flex items-center justify-between rounded-3xl border border-slate-200 p-4 dark:border-white/10">
              <span className="font-bold text-slate-800 dark:text-slate-100">الوضع الليلي / النهاري</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">الإشعارات</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between rounded-3xl border border-slate-200 p-4 dark:border-white/10">
                <span className="font-bold text-slate-800 dark:text-slate-100">إشعارات الدردشة</span>
                <input type="checkbox" checked={notifyChats} onChange={(e) => saveToggle("brao-notify-chats", e.target.checked, setNotifyChats)} />
              </label>
              <label className="flex items-center justify-between rounded-3xl border border-slate-200 p-4 dark:border-white/10">
                <span className="font-bold text-slate-800 dark:text-slate-100">إشعارات الإعلانات</span>
                <input type="checkbox" checked={notifyListings} onChange={(e) => saveToggle("brao-notify-listings", e.target.checked, setNotifyListings)} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
