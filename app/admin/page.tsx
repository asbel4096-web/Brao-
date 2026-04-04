import Link from 'next/link';

export default function AdminPage() {
  return (
    <section className="container py-10">
      <div className="card p-8">
        <h1 className="section-title">لوحة الإدارة</h1>
        <p className="section-subtitle">بوابة سريعة للموافقة على الإعلانات وإدارة المستخدمين والاشتراكات.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href="/admin/listings" className="card p-5 transition hover:-translate-y-1">
            <div className="text-xl font-black">إدارة الإعلانات</div>
            <p className="mt-2 text-sm text-slate-500">موافقة، رفض، تمييز.</p>
          </Link>
          <Link href="/admin/users" className="card p-5 transition hover:-translate-y-1">
            <div className="text-xl font-black">المستخدمون</div>
            <p className="mt-2 text-sm text-slate-500">حسابات الأعضاء والاشتراكات.</p>
          </Link>
          <Link href="/admin/subscriptions" className="card p-5 transition hover:-translate-y-1">
            <div className="text-xl font-black">الاشتراكات</div>
            <p className="mt-2 text-sm text-slate-500">الخطط المجانية والمدفوعة.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
