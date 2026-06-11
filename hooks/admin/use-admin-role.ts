"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canPerform,
  canPerformAny,
  canPerformAll,
} from "@/lib/admin/permissions";
import type { AdminRole } from "@/lib/admin/roles";

/**
 * Hook موحّد للتعامل مع role + permissions في كل صفحات/مكوّنات الأدمن.
 *
 * المُخرجات:
 *  - role: AdminRole | null
 *  - isAdminUser: boolean (أي role مخصَّص)
 *  - isSuperAdmin: boolean
 *  - loading: boolean (يأخذها من AuthContext)
 *  - can(action): دالة سريعة لفحص صلاحية واحدة
 *  - canAny(actions): فحص متعدد (OR)
 *  - canAll(actions): فحص متعدد (AND)
 *
 * استعمال:
 *   const { can, isSuperAdmin } = useAdminRole();
 *   if (can("users.ban")) { ... }
 */
export function useAdminRole() {
  const { profile, loading } = useAuth();

  // نقرأ role من profile. إذا غير موجود، نستنتجه من isAdmin القديم:
  //   isAdmin=true + role=undefined → نعامله "admin" لتوافق رجعي.
  //   isAdmin=false → null.
  const role: AdminRole | null = useMemo(() => {
    if (!profile) return null;
    const explicitRole = (profile as any).role as AdminRole | undefined;
    if (explicitRole) return explicitRole;
    // توافق رجعي للأدمنين القدامى الذين لا يحملون role
    if (profile.isAdmin) return "admin";
    return null;
  }, [profile]);

  const can = useMemo(() => (action: string) => canPerform(role, action), [role]);
  const canAny = useMemo(
    () => (actions: string[]) => canPerformAny(role, actions),
    [role]
  );
  const canAll = useMemo(
    () => (actions: string[]) => canPerformAll(role, actions),
    [role]
  );

  return {
    role,
    isAdminUser: role !== null,
    isSuperAdmin: role === "super_admin",
    loading,
    can,
    canAny,
    canAll,
  };
}
