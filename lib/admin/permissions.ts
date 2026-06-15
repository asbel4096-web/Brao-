/**
 * فحص الصلاحيات.
 *
 * `canPerform(role, action)`:
 *  - role = null/undefined → false (مستخدم عادي).
 *  - role = "super_admin" → true لأي action.
 *  - role له صلاحية "*" → true.
 *  - role له صلاحية "module.*" والـaction يبدأ بنفس module → true.
 *  - role له الصلاحية المحدّدة exact → true.
 */

import {
  ROLE_PERMISSIONS,
  type AdminRole,
  type Permission,
} from "./roles";

export function canPerform(
  role: AdminRole | null | undefined,
  action: Permission | string
): boolean {
  if (!role) return false;

  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;

  // Super Admin أو ما يحوي "*"
  if (perms.includes("*")) return true;

  // فحص exact match
  if (perms.includes(action)) return true;

  // فحص wildcard على module: "users.*" يطابق "users.ban"
  const [module] = action.split(".");
  const moduleWildcard = `${module}.*`;
  if (perms.includes(moduleWildcard)) return true;

  return false;
}

/**
 * فحص متعدّد: نتحقق من أي صلاحية في القائمة (OR logic).
 * مفيد للصفحات التي تحتاج "أحد هذه الصلاحيات على الأقل".
 */
export function canPerformAny(
  role: AdminRole | null | undefined,
  actions: (Permission | string)[]
): boolean {
  return actions.some((a) => canPerform(role, a));
}

/**
 * فحص متعدّد: نتحقق من كل الصلاحيات (AND logic).
 */
export function canPerformAll(
  role: AdminRole | null | undefined,
  actions: (Permission | string)[]
): boolean {
  return actions.every((a) => canPerform(role, a));
}

/**
 * يُرجِع كل الـpermissions الفعلية للـrole (للعرض في UI الإدارة).
 * يفكّ الـwildcards إلى قائمة كاملة.
 */
export function getEffectivePermissions(
  role: AdminRole | null | undefined,
  allPossiblePermissions: string[]
): string[] {
  if (!role) return [];
  return allPossiblePermissions.filter((p) => canPerform(role, p));
}
