import Link from 'next/link';
import { Bell, MessageCircle, Plus, Search, Settings, UserCircle2 } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/', label: 'الرئيسية' },
  { href: '/listings', label: 'الإعلانات' },
  { href: '/my-listings', label: 'إعلاناتي' },
  { href: '/messages', label: 'الدردشة' },
  { href: '/admin/listings', label: 'لوحة الموافقة' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#08101f]/85">
      <div className="container flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-ink text-lg font-black text-white">
            BC
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950 dark:text-white">براتشو كار</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">سوق السيارات وقطع الغيار في ليبيا</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-slate-800 transition hover:text-brand-700 dark:text-slate-200">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden rounded-2xl border border-slate-200 p-3 text-slate-600 md:inline-flex dark:border-slate-700 dark:text-slate-200">
            <Search size={18} />
          </button>
          <Link href="/notifications" className="hidden rounded-2xl border border-slate-200 p-3 text-slate-700 md:inline-flex dark:border-slate-700 dark:text-slate-200">
            <Bell size={18} />
          </Link>
          <Link href="/messages" className="hidden rounded-2xl border border-slate-200 p-3 text-slate-700 md:inline-flex dark:border-slate-700 dark:text-slate-200">
            <MessageCircle size={18} />
          </Link>
          <Link href="/settings" className="hidden rounded-2xl border border-slate-200 p-3 text-slate-700 md:inline-flex dark:border-slate-700 dark:text-slate-200">
            <Settings size={18} />
          </Link>
          <ThemeToggle />
          <Link href="/add-listing" className="btn-primary gap-2 bg-[#ff7a18] hover:bg-[#ea6d10]">
            <Plus size={18} />
            أضف إعلان
          </Link>
          <Link href="/profile" className="rounded-2xl border border-slate-200 p-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <UserCircle2 size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
