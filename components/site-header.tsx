import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="container pt-3 pb-4">
      <div className="mx-auto rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950 px-4 py-4 shadow-[0_18px_40px_rgba(2,6,23,0.38)] md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] bg-blue-700 text-4xl font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]">
              BC
            </div>
          </Link>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div className="rounded-[22px] border border-white/10 bg-black/35 px-7 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <h1 className="text-center text-4xl font-black leading-tight text-white md:text-5xl">
                براتشو كار
              </h1>
            </div>

            <p className="mt-4 text-center text-lg leading-8 text-white/70 md:text-xl">
              سوق السيارات وقطع الغيار والخدمات في ليبيا
            </p>
          </div>

          <Link
            href="/add-listing"
            className="flex h-[92px] w-[118px] shrink-0 flex-col items-center justify-center rounded-[24px] bg-orange-500 px-3 text-center text-white shadow-[0_12px_28px_rgba(249,115,22,0.28)] transition hover:scale-[1.02]"
          >
            <span className="text-3xl leading-none">⊕</span>
            <span className="mt-2 text-xl font-black leading-none">أضف</span>
            <span className="mt-1 text-xl font-black leading-none">إعلان</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
