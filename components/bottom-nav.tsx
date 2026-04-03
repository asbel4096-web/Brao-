"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CirclePlus, Home, MessageCircleMore, Newspaper, UserRound } from 'lucide-react';

const items = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/listings', label: 'الإعلانات', icon: Newspaper },
  { href: '/add-listing', label: 'إضافة', icon: CirclePlus, featured: true },
  { href: '/messages', label: 'الدردشة', icon: MessageCircleMore },
  { href: '/profile', label: 'حسابي', icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 rounded-[2rem] border border-white/40 bg-white/28 p-3 shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 items-end gap-2">
        {items.map(({ href, label, icon: Icon, featured }) => {
          const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));

          if (featured) {
            return (
              <Link
                key={href}
                href={href}
                className="-mt-10 flex flex-col items-center gap-1 rounded-[1.75rem] bg-orange-500 px-4 py-4 text-sm font-extrabold text-white shadow-[0_18px_36px_rgba(249,115,22,0.35)] transition hover:bg-orange-600"
              >
                <Icon size={28} strokeWidth={2.4} />
                <span>{label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-extrabold transition ${
                isActive ? 'text-slate-950' : 'text-slate-800/95'
              }`}
            >
              <Icon size={22} strokeWidth={2.2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
