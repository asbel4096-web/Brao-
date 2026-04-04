'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CirclePlus, Home, MessageCircleMore, Newspaper, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/listings', label: 'الإعلانات', icon: Newspaper },
  { href: '/add-listing', label: 'إضافة', icon: CirclePlus },
  { href: '/messages', label: 'الدردشة', icon: MessageCircleMore },
  { href: '/profile', label: 'حسابي', icon: UserRound },
  { href: '/notifications', label: 'الإشعارات', icon: Bell }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] max-w-4xl -translate-x-1/2 rounded-[30px] border border-white/60 bg-white/55 p-2 shadow-2xl backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-[22px] px-2 py-3 text-[11px] font-bold transition',
                active ? 'bg-brand-500 text-white shadow-blue' : 'text-slate-800 hover:bg-white/60'
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
