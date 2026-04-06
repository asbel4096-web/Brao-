import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="container py-3 md:py-4">
      <div className="mx-auto rounded-[32px] border border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/add-listing"
            className="flex h-[112px] w-[140px] shrink-0 flex-col items-center justify-center rounded-[28px] bg-orange-500 px-4 text-center text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition hover:scale-[1.02]"
          >
            <span className="text-4xl leading-none">⊕</span>
            <span className="mt-2 text-2xl font-black leading-none">أضف</span>
            <span className="mt-2 text-2xl font-black leading-none">إعلان</span>
          </Link>

          <Link href="/" className="flex min-w-0 flex-1 items-center justify-end gap-4">
            <div className="min-w-0 text-right">
              <h1 className="text-4xl font-black leading-[1.05] text-slate-950 dark:text-white md:text-6xl">
                براتشو
                <br />
                كار
              </h1>

              <p className="mt-3 text-lg leading-8 text-slate-500 dark:text-slate-300 md:text-2xl md:leading-10">
                سوق السيارات
                <br />
                وقطع الغيار
                <br />
                والخدمات في ليبيا
              </p>
            </div>

            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-blue-800 text-4xl font-black text-white shadow-md md:h-28 md:w-28 md:text-5xl">
              BC
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
