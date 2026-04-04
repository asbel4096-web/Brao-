export default function AdminSubscriptionsPage() {
  return (
    <section className="container py-10">
      <h1 className="section-title">إدارة الاشتراكات</h1>
      <p className="section-subtitle">واجهة تمهيدية لإدارة الباقات الشهرية والسنوية والإعلانات المميزة.</p>
      <div className="card mt-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">اشتراكات شهرية</div>
            <div className="mt-3 text-4xl font-black">184</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">اشتراكات سنوية</div>
            <div className="mt-3 text-4xl font-black">128</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">إيراد تقديري</div>
            <div className="mt-3 text-4xl font-black">26,400 د.ل</div>
          </div>
        </div>
      </div>
    </section>
  );
}
