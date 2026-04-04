'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.filter = dark ? 'invert(0.96) hue-rotate(180deg)' : '';
    return () => { document.body.style.filter = ''; };
  }, [dark]);
  return (
    <section className="container py-10">
      <div className="mx-auto max-w-3xl card p-8">
        <h1 className="section-title">الإعدادات</h1>
        <div className="mt-6 flex items-center justify-between rounded-[24px] bg-slate-50 p-4">
          <div>
            <div className="font-black text-slate-900">الوضع الليلي / النهاري</div>
            <div className="mt-1 text-sm text-slate-500">تبديل سريع لشكل الواجهة.</div>
          </div>
          <button onClick={() => setDark((v) => !v)} className="btn-primary">{dark ? 'الوضع النهاري' : 'الوضع الليلي'}</button>
        </div>
      </div>
    </section>
  );
}
