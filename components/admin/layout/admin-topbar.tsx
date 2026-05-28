"use client";

import Link from "next/link";
import { Menu, Search, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { RoleBadge } from "@/components/admin/ui/role-badge";

/**
 * Topbar الأدمن - شريط علوي ثابت.
 *
 * يحوي:
 *  - زر hamburger للموبايل (يفتح الـsidebar كـdrawer)
 *  - حقل بحث (UI فقط الآن - سنُربطه بنظام بحث موحَّد لاحقاً)
 *  - معلومات المستخدم المسجَّل + role badge
 *  - رابط للموقع العام
 *
 * Glassmorphism: backdrop-blur + خلفية شفافة.
 */

interface Props {
  onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: Props) {
  const { profile } = useAuth();
  const { role } = useAdminRole();

  return (
    <header
      className="
        sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/70
        bg-white/80 px-3 backdrop-blur-md
        dark:border-slate-800 dark:bg-slate-950/80
        sm:px-4
      "
    >
      {/* زر hamburger - للموبايل فقط */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="فتح القائمة"
        className="
          grid h-9 w-9 place-items-center rounded-lg text-slate-600
          transition hover:bg-slate-100 hover:text-slate-900
          dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white
          lg:hidden
        "
      >
        <Menu size={18} />
      </button>

      {/* البحث - hidden على الموبايل لتوفير مكان */}
      <div className="relative hidden flex-1 sm:block">
        <Search
          size={15}
          className="
            pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
            dark:text-slate-500
          "
        />
        <input
          type="search"
          placeholder="بحث عن مستخدم، إعلان، ID..."
          className="
            h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pe-9 ps-3
            text-[13px] outline-none transition
            focus:border-brand-400 focus:bg-white
            dark:border-slate-800 dark:bg-slate-900/50 dark:focus:bg-slate-900
          "
        />
      </div>

      {/* مساحة فارغة على الموبايل (لا يوجد بحث) */}
      <div className="flex-1 sm:hidden" />

      {/* رابط للموقع العام */}
      <Link
        href="/"
        prefetch={false}
        title="فتح الموقع العام"
        className="
          hidden h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3
          text-[12px] font-bold text-slate-600 transition
          hover:border-brand-300 hover:text-brand-700
          dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-700
          sm:inline-flex
        "
      >
        <ExternalLink size={13} />
        الموقع
      </Link>

      {/* معلومات المستخدم */}
      {profile && (
        <div className="flex items-center gap-2">
          <div className="hidden text-left sm:flex sm:flex-col sm:items-end sm:leading-none">
            <span className="max-w-[140px] truncate text-[12px] font-black text-slate-900 dark:text-white">
              {profile.name || profile.email || "أدمن"}
            </span>
            <div className="mt-1">
              <RoleBadge role={role} />
            </div>
          </div>
          <div
            className="
              flex h-9 w-9 items-center justify-center rounded-xl
              bg-gradient-to-br from-brand-700 to-brand-500
              text-[12px] font-black text-white shadow-sm
            "
          >
            {(profile.name || profile.email || "?").charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  );
}
