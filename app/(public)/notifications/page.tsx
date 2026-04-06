"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CircleCheckBig,
  MessageCircleMore,
  Clock3,
  Trash2
} from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "message" | "listing" | "system" | "warning";
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "رسالة جديدة",
    body: "وصلتك رسالة جديدة بخصوص إعلان مرسيدس E350 2014.",
    time: "منذ 5 دقائق",
    type: "message",
    read: false
  },
  {
    id: "2",
    title: "تمت الموافقة على إعلانك",
    body: "تم نشر إعلان هيونداي أزيرا 2012 بنجاح في السوق.",
    time: "منذ ساعة",
    type: "listing",
    read: false
  },
  {
    id: "3",
    title: "تنبيه بخصوص الإعلان",
    body: "إعلان قطع غيار هيونداي يحتاج تعديل بعض التفاصيل قبل النشر.",
    time: "اليوم",
    type: "warning",
    read: true
  },
  {
    id: "4",
    title: "تحديث من النظام",
    body: "تم تحسين تجربة البحث والأقسام في براتشو كار.",
    time: "أمس",
    type: "system",
    read: true
  }
];

function notificationMeta(type: NotificationItem["type"]) {
  switch (type) {
    case "message":
      return {
        icon: MessageCircleMore,
        iconClass: "text-blue-600",
        badge: "رسالة"
      };
    case "listing":
      return {
        icon: CircleCheckBig,
        iconClass: "text-emerald-600",
        badge: "إعلان"
      };
    case "warning":
      return {
        icon: CircleAlert,
        iconClass: "text-amber-600",
        badge: "تنبيه"
      };
    default:
      return {
        icon: Bell,
        iconClass: "text-slate-600",
        badge: "نظام"
      };
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="container pb-8">
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#2F49C8] px-4 py-3 text-sm font-black text-white"
            >
              <CheckCheck className="h-4 w-4" />
              تحديد الكل كمقروء
            </button>

            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                الإشعارات
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                متابعة الرسائل، الإعلانات، وتنبيهات الحساب.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-slate-950 dark:text-white">
              {notifications.length}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              إجمالي الإشعارات
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-[#F58233]">
              {unreadCount}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              غير مقروءة
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-emerald-600">
              {notifications.filter((item) => item.type === "listing").length}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              تخص الإعلانات
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-blue-600">
              {notifications.filter((item) => item.type === "message").length}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
              تخص الرسائل
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              آخر التنبيهات
            </h2>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {notifications.length} إشعار
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50 px-4 py-10 text-center text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              لا توجد إشعارات حاليًا.
            </div>
          ) : (
            <div className="grid gap-3">
              {notifications.map((item) => {
                const meta = notificationMeta(item.type);
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[22px] border px-4 py-4 transition ${
                      item.read
                        ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                        : "border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => removeNotification(item.id)}
                        className="rounded-xl p-2 text-slate-400 transition hover:text-red-500"
                        aria-label="حذف الإشعار"
                        title="حذف الإشعار"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="flex-1 text-right">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {!item.read ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F58233]" />
                            ) : null}

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {meta.badge}
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-slate-950 dark:text-white">
                            {item.title}
                          </h3>
                        </div>

                        <p className="mt-2 text-base leading-8 text-slate-600 dark:text-slate-300">
                          {item.body}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock3 className="h-4 w-4" />
                            {item.time}
                          </div>

                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800">
                            <Icon className={`h-6 w-6 ${meta.iconClass}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
