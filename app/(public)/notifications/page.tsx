export default function NotificationsPage() {
  const items = [
    'تم اعتماد إعلانك الأخير.',
    'لديك رسالة جديدة من عميل مهتم.',
    'أكمل بيانات حسابك لزيادة الثقة.'
  ];
  return (
    <section className="container py-10">
      <h1 className="section-title">الإشعارات</h1>
      <div className="mt-6 space-y-3">
        {items.map((item) => <div key={item} className="card p-5 text-sm font-bold text-slate-700">{item}</div>)}
      </div>
    </section>
  );
}
