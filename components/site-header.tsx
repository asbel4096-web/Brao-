import Link from 'next/link';
import { Bell, CirclePlus, MessageCircle, Search, Settings, UserCircle2 } from 'lucide-react';

const links = [
  { href: '/', label: 'الرئيسية' },
  { href: '/listings', label: 'الإعلانات' },
  { href: '/my-listings', label: 'إعلاناتي' },
  { href: '/messages', label: 'الدردشة' },
  { href: '/notifications', label: 'الإشعارات' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="container flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-brand-700 to-brand-900 text-xl font-black text-white shadow-blue">BC</div>
          <div>
            <div className="text-[1.8rem] font-black leading-none text-slate-950">براتشو كار</div>
            <div className="mt-1 text-sm text-slate-500">سوق السيارات وقطع الغيار والخدمات في ليبيا</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-slate-700 transition hover:text-brand-700">
              {link.label}
            </Link>
          ))}
          <Link href="/admin/listings" className="text-sm font-bold text-slate-700 transition hover:text-brand-700">لوحة الموافقة</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/notifications" className="hidden rounded-[20px] border border-slate-200 bg-white p-3 text-slate-700 md:inline-flex"><Bell size={18} /></Link>
          <button className="hidden rounded-[20px] border border-slate-200 bg-white p-3 text-slate-700 md:inline-flex"><Search size={18} /></button>
          <Link href="/messages" className="hidden rounded-[20px] border border-slate-200 bg-white p-3 text-slate-700 md:inline-flex"><MessageCircle size={18} /></Link>
          <Link href="/settings" className="hidden rounded-[20px] border border-slate-200 bg-white p-3 text-slate-700 md:inline-flex"><Settings size={18} /></Link>
          <Link href="/add-listing" className="btn-primary">
            <CirclePlus size={18} />
            أضف إعلان
          </Link>
          <Link href="/profile" className="rounded-[20px] border border-slate-200 bg-white p-3 text-slate-700"><UserCircle2 size={18} /></Link>
        </div>
      </div>
    </header>
  );
}
