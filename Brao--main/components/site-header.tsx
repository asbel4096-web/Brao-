import Link from 'next/link';
import { Bell, MessageCircle, Plus, Search, UserCircle2 } from 'lucide-react';

const links = [
  { href: '/', label: 'الرئيسية' },
  { href: '/listings', label: 'الإعلانات' },
  { href: '/pricing', label: 'الاشتراكات' },
  { href: '/messages', label: 'الدردشة' },
  { href: '/admin', label: 'الإدارة' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="container flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-ink text-lg font-black text-white">
            BC
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950">براتشو كار</div>
            <div className="text-sm text-slate-500">سوق السيارات وقطع الغيار في ليبيا</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-slate-700 transition hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden rounded-2xl border border-slate-200 p-3 text-slate-600 md:inline-flex">
            <Search size={18} />
          </button>
          <button className="hidden rounded-2xl border border-slate-200 p-3 text-slate-600 md:inline-flex">
            <Bell size={18} />
          </button>
          <Link href="/messages" className="hidden rounded-2xl border border-slate-200 p-3 text-slate-600 md:inline-flex">
            <MessageCircle size={18} />
          </Link>
          <Link href="/add-listing" className="btn-primary gap-2">
            <Plus size={18} />
            أضف إعلان
          </Link>
          <Link href="/profile" className="rounded-2xl border border-slate-200 p-3 text-slate-700">
            <UserCircle2 size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
