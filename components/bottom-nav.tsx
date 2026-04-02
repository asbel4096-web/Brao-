import Link from 'next/link';
import { CirclePlus, Home, MessageCircleMore, Newspaper, UserRound } from 'lucide-react';

const items = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/listings', label: 'الإعلانات', icon: Newspaper },
  { href: '/add-listing', label: 'إضافة', icon: CirclePlus, accent: true },
  { href: '/messages', label: 'الدردشة', icon: MessageCircleMore },
  { href: '/profile', label: 'حسابي', icon: UserRound }
];

export function BottomNav() {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 rounded-[2rem] border border-white/10 bg-slate-950/92 p-3 text-white shadow-2xl backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-2">
        {items.map(({ href, label, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition ${
              accent
                ? 'bg-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.35)] hover:bg-orange-600'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
