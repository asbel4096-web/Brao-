"use client";

import { ROLE_METADATA, type AdminRole } from "@/lib/admin/roles";

/**
 * شارة الدور - لعرض role المستخدم في الجداول والصفحات.
 *
 * size:
 *  - sm: للجداول المزدحمة
 *  - md: للـheaders والـprofiles
 */

interface Props {
  role: AdminRole | null;
  size?: "sm" | "md";
}

export function RoleBadge({ role, size = "sm" }: Props) {
  if (!role) {
    return (
      <span
        className={`
          inline-flex items-center rounded-full border border-slate-200
          bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500
          dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400
          ${size === "md" ? "px-3 py-1 text-xs" : ""}
        `}
      >
        مستخدم
      </span>
    );
  }

  const meta = ROLE_METADATA[role];

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full
        px-2 py-0.5 text-[10px] font-black text-white shadow-sm
        ${meta.color}
        ${size === "md" ? "px-3 py-1 text-xs" : ""}
      `}
    >
      {meta.label}
    </span>
  );
}
