import Link from 'next/link';

export default function AdminPage() {
  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl card p-8">
        <h1 className="section-title">لوحة تحكم المشرف</h1>
        <p className="section-subtitle">واجهة بسيطة لمراجعة الإعلانات المعلقة واعتمادها أو رفضها أو حذفها.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link href="/admin/listings" className="card p-6 transition hover:border-brand-200">
            <div className="text-xl font-black text-slate-950 dark:text-white">إدارة الإعلانات</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">اعتماد الإعلانات، رفضها، أو حذفها.</p>
          </Link>
          <Link href="/my-listings" className="card p-6 transition hover:border-brand-200">
            <div className="text-xl font-black text-slate-950 dark:text-white">إعلاناتي</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">رجوع سريع لإعلانات الحساب الحالي.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
