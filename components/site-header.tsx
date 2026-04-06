import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import { CirclePlus } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="container pt-3 pb-4">
      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo compact />

          <Link
            href="/add-listing"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F58233] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(245,130,51,0.24)] transition hover:scale-[1.02]"
          >
            <CirclePlus className="h-5 w-5" />
            <span>أضف إعلان</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
