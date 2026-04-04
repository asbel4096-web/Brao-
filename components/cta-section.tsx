import Link from 'next/link';

export function CTASection() {
  return (
    <section className="container py-10">
      <div className="card bg-slate-950 px-6 py-8 text-white sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h3 className="text-3xl font-black">جاهز لتحويل براتشو كار إلى منصة فعلية؟</h3>
            <p className="mt-3 max-w-2xl text-white/70">
              هذا المشروع منظم ليكون بداية حقيقية: صفحات عامة، إدارة، خطط اشتراك، وواجهات جاهزة للربط الكامل مع Firebase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-primary">الاشتراكات</Link>
            <Link href="/admin" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">لوحة الإدارة</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
