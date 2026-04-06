import Link from "next/link";
import ThemeToggle from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="container pt-2 pb-4 md:pt-3 md:pb-5">
      <div className="mx-auto rounded-[30px] border border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-blue-800 text-3xl font-black text-white shadow-sm md:h-24 md:w-24 md:text-4xl">
              BC
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-black leading-tight text-slate-950 dark:text-white md:text-5xl">
                براتشو كار
              </h1>
              <p className="mt-2 text-base leading-7 text-slate-500 dark:text-slate-300 md:text-xl">
                سوق السيارات وقطع الغيار والخدمات في ليبيا
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/add-listing"
              className="flex h-[92px] w-[118px] shrink-0 flex-col items-center justify-center rounded-[24px] bg-orange-500 px-3 text-center text-white shadow-[0_12px_28px_rgba(249,115,22,0.28)] transition hover:scale-[1.02] md:h-[100px] md:w-[132px]"
            >
              <span className="text-3xl leading-none">⊕</span>
              <span className="mt-2 text-xl font-black leading-none">أضف</span>
              <span className="mt-1 text-xl font-black leading-none">إعلان</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
