export default function MessagesPage() {
  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="card p-4">
          <h2 className="text-xl font-black">المحادثات</h2>
          <div className="mt-4 space-y-3">
            {['أحمد سالم', 'ورشة الماهر', 'بيت الغيار'].map((name) => (
              <div key={name} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-black text-slate-900">{name}</div>
                <div className="mt-1 text-sm text-slate-500">مرحبًا، هل السيارة متوفرة؟</div>
              </div>
            ))}
          </div>
        </aside>
        <div className="card flex min-h-[520px] flex-col p-4">
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xl font-black">أحمد سالم</div>
            <div className="text-sm text-slate-500">دردشة تجريبية قابلة للربط مع Firestore</div>
          </div>
          <div className="flex-1 space-y-4 py-6">
            <div className="max-w-md rounded-3xl rounded-tr-md bg-slate-100 p-4 text-sm text-slate-700">
              السلام عليكم، هل السيارة موجودة؟
            </div>
            <div className="mr-auto max-w-md rounded-3xl rounded-tl-md bg-brand-600 p-4 text-sm text-white">
              نعم موجودة، تفضل بالسؤال.
            </div>
          </div>
          <div className="mt-auto grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" placeholder="اكتب رسالتك..." />
            <button className="btn-primary">إرسال</button>
          </div>
        </div>
      </div>
    </section>
  );
}
