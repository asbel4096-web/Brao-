import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="container py-3">
      <div className="mx-auto overflow-hidden rounded-[32px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/add-listing"
            className="flex min-h-[88px] min-w-[150px] flex-col items-center justify-center rounded-[28px] bg-orange-500 px-5 py-4 text-center text-white shadow-lg transition hover:opacity-95"
          >
            <span className="text-4xl leading-none">⊕</span>
            <span className="mt-1 text-2xl font-black">أضف</span>
            <span className="text-2xl font-black">إعلان</span>
          </Link>

          <Link href="/" className="flex flex-1 items-center justify-end gap-4">
            <div className="text-right">
              <div className="text-4xl font-black leading-tight text-slate-950 dark:text-white md:text-6xl">
                براتشو كار
              </div>
              <div className="mt-2 text-lg font-medium text-slate-500 dark:text-slate-300 md:text-2xl">
                سوق السيارات وقطع الغيار
              </div>
              <div className="text-lg font-medium text-slate-500 dark:text-slate-300 md:text-2xl">
                والخدمات في ليبيا
              </div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-blue-800 text-4xl font-black text-white shadow-md md:h-28 md:w-28 md:text-5xl">
              BC
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
