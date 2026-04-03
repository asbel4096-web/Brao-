export default function NotificationsPage() {
  const items = [
    'تم إرسال إعلانك الجديد إلى لوحة المراجعة.',
    'تم اعتماد إعلان مرسيدس E350.',
    'لديك رسالة جديدة من عميل مهتم.',
    'يمكنك تحديث إعلانك وإرساله للمراجعة مجددًا.'
  ];

  return (
    <section className="container py-10">
      <h1 className="section-title">الإشعارات</h1>
      <p className="section-subtitle">مركز تنبيهات بسيط لمتابعة حالة الإعلانات والرسائل.</p>
      <div className="mt-6 space-y-4">
        {items.map((item) => <div key={item} className="card p-5 text-sm dark:text-slate-200">{item}</div>)}
      </div>
    </section>
  );
}
