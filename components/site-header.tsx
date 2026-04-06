import Link from "next/link";
import ThemeToggle from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="container pt-3 pb-5">
      <div className="mx-auto rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950 px-4 py-5 shadow-[0_18px_40px_rgba(2,6,23,0.45)] md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/add-listing"
            className="flex h-[112px] w-[132px] shrink-0 flex-col items-center justify-center rounded-[28px] bg-orange-500 px-3 text-center text-white shadow-[0_14px_34px_rgba(249,115,22,0.35)] transition hover:scale-[1.02]"
          >
            <span className="text-3xl leading-none">⊕</span>
            <span className="mt-2 text-2xl font-black leading-none">أضف</span>
            <span className="mt-2 text-2xl font-black leading-none">إعلان</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
            <div className="flex min-w-0 flex-col items-end gap-3">
              <div className="rounded-[26px] border border-white/10 bg-black/35 px-6 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                <h1 className="text-right text-4xl font-black leading-[1.05] text-white md:text-5xl">
                  براتشو كار
                </h1>
              </div>

              <p className="max-w-[260px] text-right text-base leading-8 text-white/70 md:max-w-[340px] md:text-lg">
                سوق السيارات وقطع الغيار والخدمات في ليبيا
              </p>

              <div className="flex items-center gap-3">
                <ThemeToggle />

                <Link
                  href="/profile"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 backdrop-blur"
                  aria-label="حسابي"
                  title="حسابي"
                >
                  👤
                </Link>

                <Link
                  href="/notifications"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 backdrop-blur"
                  aria-label="الإشعارات"
                  title="الإشعارات"
                >
                  🔔
                </Link>
              </div>
            </div>

            <Link
              href="/"
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-blue-700 text-4xl font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] md:h-28 md:w-28 md:text-5xl"
            >
              BC
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
