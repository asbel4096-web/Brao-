const notifications = [
  { title: 'تم تفعيل تسجيل الدخول', body: 'حسابك أصبح جاهزًا عبر Google ورقم الهاتف.', time: 'الآن' },
  { title: 'إضافة إعلان جديد', body: 'يمكنك الآن نشر إعلانك مع صور وموقع وخيارات اتصال.', time: 'قبل قليل' },
  { title: 'تنبيه الإشعارات', body: 'صفحة الإشعارات أصبحت جاهزة للربط لاحقًا مع Firestore.', time: 'اليوم' }
];

export default function NotificationsPage() {
  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="section-title">الإشعارات</h1>
          <p className="section-subtitle">هذه الصفحة جاهزة الآن، ويمكن ربطها لاحقًا بإشعارات Firestore الحقيقية.</p>
        </div>

        <div className="space-y-4">
          {notifications.map((item) => (
            <article key={item.title} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.body}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{item.time}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
