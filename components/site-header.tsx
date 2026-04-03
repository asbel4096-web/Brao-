import Link from 'next/link';
import { Bell, MessageCircle, Plus, Search, Settings, UserCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  { href: '/', label: 'الرئيسية' },
  { href: '/listings', label: 'الإعلانات' },
  { href: '/messages', label: 'الدردشة' },
  { href: '/notifications', label: 'الإشعارات' },
  { href: '/settings', label: 'الإعدادات' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/82 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
      <div className="container flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-ink text-lg font-black text-white shadow-blue">
            BC
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950 dark:text-white">براتشو كار</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">سوق السيارات وقطع الغيار في ليبيا</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-slate-800 transition hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="hidden rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 md:inline-flex">
            <Search size={18} />
          </button>
          <Link href="/notifications" className="hidden rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 md:inline-flex">
            <Bell size={18} />
          </Link>
          <Link href="/messages" className="hidden rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 md:inline-flex">
            <MessageCircle size={18} />
          </Link>
          <Link href="/settings" className="hidden rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 md:inline-flex">
            <Settings size={18} />
          </Link>
          <Link href="/add-listing" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600">
            <Plus size={18} />
            أضف إعلان
          </Link>
          <Link href="/profile" className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            <UserCircle2 size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
