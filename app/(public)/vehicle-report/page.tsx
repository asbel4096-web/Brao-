"use client";

import { useState } from 'react';
import { FileSearch, Globe2, Zap } from 'lucide-react';

const sources = [
  {
    key: 'kr',
    title: 'السيارات الكورية',
    desc: 'سجلات تفصيلية، المسافة المقطوعة، والتاريخ المباشر.',
    icon: Zap
  },
  {
    key: 'us-ca',
    title: 'السيارات الأمريكية والكندية',
    desc: 'واجهة جاهزة لربط VIN مع أي مزود بيانات لاحقًا.',
    icon: Globe2
  }
] as const;

export default function VehicleReportPage() {
  const [vin, setVin] = useState('');
  const [source, setSource] = useState<(typeof sources)[number]['key']>('kr');
  const [message, setMessage] = useState('');

  const handleSearch = () => {
    if (!vin.trim()) {
      setMessage('اكتب كود المركبة أولًا.');
      return;
    }
    setMessage('تم تجهيز الواجهة. الخطوة التالية هي ربط مزود بيانات فعلي للتقرير.');
  };

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#10246c] to-[#2443b1] p-6 text-white shadow-2xl md:p-10">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
          <FileSearch size={30} />
        </div>
        <h1 className="text-center text-4xl font-black md:text-5xl">تقرير تاريخ المركبة</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-8 text-white/75">
          اختر مصدر المركبة ثم اكتب VIN أو كود السيارة للحصول على صفحة تقرير احترافية بهوية براتشو كار.
        </p>

        <div className="mt-10 space-y-4">
          {sources.map((item) => {
            const Icon = item.icon;
            const active = source === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSource(item.key)}
                className={`flex w-full items-center justify-between rounded-[1.6rem] border px-5 py-5 text-right transition ${
                  active ? 'border-orange-300 bg-white/12' : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-black">{item.title}</div>
                    <div className="mt-1 text-sm text-white/70">{item.desc}</div>
                  </div>
                </div>
                <span className="text-3xl">‹</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 rounded-[1.8rem] border border-white/15 bg-white/5 p-5">
          <label className="mb-3 block text-sm font-bold text-white/75">VIN / كود السيارة</label>
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="مثال: KMHFG41EBCA123456"
            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-left text-white outline-none placeholder:text-white/35"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
          >
            بحث عن التقرير
          </button>
          {message ? <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">{message}</div> : null}
        </div>
      </div>
    </section>
  );
}
