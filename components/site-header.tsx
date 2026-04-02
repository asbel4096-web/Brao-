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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur">
      <div className="container flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-ink text-lg font-black text-white shadow-blue">
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
          <button className="hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 md:inline-flex">
            <Search size={18} />
          </button>
          <button className="hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 md:inline-flex">
            <Bell size={18} />
          </button>
          <Link href="/messages" className="hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 md:inline-flex">
            <MessageCircle size={18} />
          </Link>
          <Link href="/add-listing" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600">
            <Plus size={18} />
            أضف إعلان
          </Link>
          <Link href="/profile" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
            <UserCircle2 size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
