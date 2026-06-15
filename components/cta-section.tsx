import Link from "next/link";
import { Plus } from "lucide-react";

export function CTASection() {
  return (
    <section className="container py-8 sm:py-10">
      <div className="card overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-8 text-white sm:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h3 className="text-2xl font-black sm:text-3xl">
              ابدأ بيع سيارتك أو خدمتك اليوم
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              نشر مجاني وسهل، ووصول لآلاف المستخدمين في كل ليبيا.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/add-listing" className="btn-action">
              <Plus size={18} /> أضف إعلان مجاناً
            </Link>
            <Link
              href="/pricing"
              className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
            >
              الباقات
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
