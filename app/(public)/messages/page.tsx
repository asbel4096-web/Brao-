export default function MessagesPage() {
  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl card p-8">
        <h1 className="section-title">دردشاتي</h1>
        <p className="section-subtitle">واجهة محادثات مبدئية يمكن تطويرها لاحقًا إلى دردشة حقيقية بين البائع والمشتري.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {['عميل مهتم بسيارة E350','استفسار عن قطع غيار كهربائية','عميل يسأل عن ميكانيكي متنقل'].map((item) => <div key={item} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 font-bold text-slate-700">{item}</div>)}
          </div>
          <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6 text-sm leading-8 text-slate-600">يمكنك لاحقًا ربط هذه الصفحة برسائل Firestore أو خدمة دردشة مباشرة. حاليًا هي واجهة جاهزة لتطوير المرحلة التالية.</div>
        </div>
      </div>
    </section>
  );
}
