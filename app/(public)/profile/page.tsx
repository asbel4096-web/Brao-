"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  ChevronLeft,
  CircleHelp,
  Heart,
  LogOut,
  MessageCircleMore,
  PencilLine,
  Settings,
  ShieldCheck,
  UserCircle2
} from "lucide-react";

const user = {
  name: "طه محمد",
  phone: "0912345678",
  city: "طرابلس",
  bio: "مهتم بسوق السيارات وقطع الغيار والخدمات داخل ليبيا.",
  listingsCount: 12,
  favoritesCount: 8,
  messagesCount: 5
};

const stats = [
  { label: "إعلاناتي", value: user.listingsCount, href: "/my-listings" },
  { label: "المفضلة", value: user.favoritesCount, href: "/favorites" },
  { label: "الرسائل", value: user.messagesCount, href: "/messages" }
];

const menuItems = [
  {
    title: "إعلاناتي",
    subtitle: "عرض وتعديل وحذف الإعلانات",
    href: "/my-listings",
    icon: PencilLine
  },
  {
    title: "المفضلة",
    subtitle: "الإعلانات التي قمت بحفظها",
    href: "/favorites",
    icon: Heart
  },
  {
    title: "الدردشة",
    subtitle: "الرسائل والمحادثات",
    href: "/messages",
    icon: MessageCircleMore
  },
  {
    title: "الإشعارات",
    subtitle: "تنبيهات الحساب والإعلانات",
    href: "/notifications",
    icon: Bell
  },
  {
    title: "الإعدادات",
    subtitle: "إعدادات التطبيق والحساب",
    href: "/settings",
    icon: Settings
  },
  {
    title: "الدعم والمساعدة",
    subtitle: "الأسئلة الشائعة والتواصل",
    href: "/help",
    icon: CircleHelp
  }
];

export default function ProfilePage() {
  const [loggedIn] = useState(true);

  if (!loggedIn) {
    return (
      <section className="container pb-8">
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <UserCircle2 className="h-14 w-14 text-slate-500" />
            </div>

            <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
              حسابي
            </h1>

            <p className="mt-3 max-w-md text-lg leading-8 text-slate-500 dark:text-slate-300">
              سجّل الدخول لإدارة إعلاناتك، الرسائل، المفضلة، والإعدادات الخاصة بك.
            </p>

            <div className="mt-6 grid w-full gap-3 md:max-w-md">
              <button className="rounded-[18px] bg-[#2F49C8] px-6 py-4 text-lg font-black text-white">
                تسجيل الدخول عبر Google
              </button>

              <button className="rounded-[18px] border border-slate-300 bg-white px-6 py-4 text-lg font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                تسجيل الدخول برقم الهاتف
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container pb-8">
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <button className="rounded-2xl border border-slate-200 p-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                حسابي
              </h1>
              <p className="mt-1 text-base text-slate-500 dark:text-slate-300">
                إدارة الحساب والإعلانات
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div className="text-right">
                <div className="text-2xl font-black text-slate-950 dark:text-white">
                  {user.name}
                </div>
                <div className="mt-2 text-base text-slate-500 dark:text-slate-300">
                  {user.phone}
                </div>
                <div className="mt-1 text-base text-slate-500 dark:text-slate-300">
                  {user.city}
                </div>
              </div>

              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                <UserCircle2 className="h-14 w-14 text-slate-500 dark:text-slate-300" />
              </div>
            </div>

            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
              {user.bio}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/profile/edit"
                className="rounded-[16px] bg-[#2F49C8] px-5 py-3 text-base font-black text-white"
              >
                تعديل الحساب
              </Link>

              <button className="rounded-[16px] border border-slate-300 bg-white px-5 py-3 text-base font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                مشاركة الملف
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-3xl font-black text-slate-950 dark:text-white">
                {item.value}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-300">
                {item.label}
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-2xl font-black text-slate-950 dark:text-white">
            إدارة الحساب
          </h2>

          <div className="grid gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-400" />

                  <div className="flex-1 text-right">
                    <div className="text-xl font-black text-slate-950 dark:text-white">
                      {item.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                      {item.subtitle}
                    </div>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-6 w-6 text-[#2F49C8]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <ChevronLeft className="h-5 w-5 text-slate-400" />

              <div className="flex-1 text-right">
                <div className="text-xl font-black text-slate-950 dark:text-white">
                  الأمان والخصوصية
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  حماية الحساب وبياناتك
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShieldCheck className="h-6 w-6 text-[#2F49C8]" />
              </div>
            </div>

            <button className="flex items-center justify-between rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20">
              <ChevronLeft className="h-5 w-5" />

              <div className="flex-1 text-right">
                <div className="text-xl font-black">تسجيل الخروج</div>
                <div className="mt-1 text-sm text-red-500">
                  الخروج من هذا الجهاز
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900">
                <LogOut className="h-6 w-6" />
              </div>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
