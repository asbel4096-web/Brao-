"use client";

import type { ReactNode } from "react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";

/**
 * W0 security (2026-11-19): per-page permission check for admin pages that had none
 * (the admin layout only checks "is staff"). Same denied message style as /admin/analytics.
 * The real protection stays on the server (verifyAdminRequest + Firestore rules); this only
 * keeps staff without the permission out of the screen.
 */
export function AdminPermissionGate({
  permission,
  label,
  children,
}: {
  permission: string;
  label: string;
  children: ReactNode;
}) {
  const { can, loading } = useAdminRole();
  if (loading) return null;
  if (!can(permission)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية {label}.
      </div>
    );
  }
  return <>{children}</>;
}
