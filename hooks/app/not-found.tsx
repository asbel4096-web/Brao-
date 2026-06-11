import Link from "next/link";
import { Home, Search, Car } from "lucide-react";

/**
 * صفحة 404 احترافية.
 *
 * تظهر عند فتح رابط غير موجود (أو إعلان محذوف).
 * - رسالة واضحة + زر العودة للرئيسية + زر تصفّح الإعلانات.
 * - تحافظ على هوية Bratsho (أزرق + تصميم نظيف).
 *
 * ملاحظة: "إعلانات مشابهة" تتطلب معرفة سياق الإعلان المحذوف،
 * وهي غير متاحة في not-found العام. بدلاً منها نوجّه المستخدم
 * لتصفّح كل الإعلانات (تجربة أوضح).
 */

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center"
    >
      {/* أيقونة */}
      <div className="relative mb-6">
        <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg">
          <Car size={44} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      {/* 404 */}
      <h1 className="text-6xl font-black text-brand-700 dark:text-brand-300">
        404
      </h1>
      <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">
        الإعلان غير متوفر
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        قد يكون هذا الإعلان قد تم حذفه أو لم يعد متاحاً، أو أن الرابط غير صحيح.
      </p>

      {/* أزرار */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-800"
        >
          <Home size={17} />
          العودة للرئيسية
        </Link>
        <Link
          href="/listings"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Search size={17} />
          تصفّح الإعلانات
        </Link>
      </div>
    </div>
  );
}
