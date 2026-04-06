import Link from 'next/link';

export default function SettingsPage() {
  return (
    <section className="container py-10">
      <h1 className="section-title">الإعدادات</h1>
      <p className="section-subtitle">إعدادات أساسية للمستخدم مع روابط سريعة لإدارة الحساب والإعلانات.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-xl font-black dark:text-white">إدارة الحساب</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">الدخول والخروج وتحديث بيانات العرض.</p>
          <Link href="/profile" className="btn-secondary mt-4">فتح حسابي</Link>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black dark:text-white">إدارة الإعلانات</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">عرض إعلاناتي، التعديل، والحذف عند الحاجة.</p>
          <Link href="/my-listings" className="btn-secondary mt-4">فتح إعلاناتي</Link>
        </div>
      </div>
    </section>
  );
}
