"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Home, MessageCircle, Newspaper, PlusCircle, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/listings', label: 'الإعلانات', icon: Newspaper },
  { href: '/add-listing', label: 'إضافة', icon: PlusCircle, primary: true },
  { href: '/messages', label: 'الدردشة', icon: MessageCircle },
  { href: '/profile', label: 'حسابي', icon: UserCircle2 }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 lg:hidden">
      <nav className="mx-auto grid max-w-3xl grid-cols-5 items-center rounded-[2rem] border border-white/60 bg-white/55 px-2 py-2 shadow-2xl backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl px-2 py-3 text-center text-[11px] font-bold transition',
                item.primary
                  ? 'bg-[#ff7a18] text-white shadow-lg shadow-orange-200'
                  : active
                    ? 'bg-white/80 text-slate-950'
                    : 'text-slate-900 hover:bg-white/70'
              )}
            >
              <Icon size={20} className="mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
