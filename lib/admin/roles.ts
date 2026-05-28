/**
 * تعريف أدوار الأدمن وصلاحياتها.
 *
 * الفلسفة:
 *  - 5 أدوار: super_admin, admin, moderator, support, analytics.
 *  - Permissions في صيغة "module.action" (مثل "users.ban").
 *  - "*" = كل الصلاحيات (للـSuper Admin).
 *  - "module.*" = كل صلاحيات module معين (مثل "listings.*").
 *
 * كيف نستخدم؟
 *  - في الـUI: استدعاء `canPerform(role, action)` لإخفاء/إظهار أزرار.
 *  - في API routes: نفس الفحص server-side قبل تنفيذ الإجراء.
 *  - في Firestore rules: نفحص user.role (المستخدم له role في users/{uid}).
 *
 * نلاحظ:
 *  - isAdmin القديم في AuthContext = role !== null. (موجود سابقاً)
 *  - نُبقي isAdmin للتوافق، ونضيف role + canPerform الجديد.
 *  - عند ترقية أحد إلى role، نُحدّث users/{uid}.role + isAdmin=true.
 */

export type AdminRole =
  | "super_admin"
  | "admin"
  | "moderator"
  | "support"
  | "analytics";

/**
 * كل الصلاحيات المتاحة في النظام.
 * نحتفظ بها كـconstant ومنظَّمة حسب الـmodule لسهولة الإضافة.
 */
export const PERMISSIONS = {
  // المستخدمون
  USERS_VIEW: "users.view",
  USERS_EDIT: "users.edit",
  USERS_BAN: "users.ban",
  USERS_VERIFY: "users.verify",
  USERS_DELETE: "users.delete",
  USERS_ROLE_ASSIGN: "users.role_assign", // Super Admin فقط

  // الإعلانات
  LISTINGS_VIEW: "listings.view",
  LISTINGS_APPROVE: "listings.approve",
  LISTINGS_REJECT: "listings.reject",
  LISTINGS_EDIT: "listings.edit",
  LISTINGS_DELETE: "listings.delete",
  LISTINGS_FEATURE: "listings.feature",
  LISTINGS_PIN: "listings.pin",

  // التعليقات والرسائل
  COMMENTS_DELETE: "comments.delete",
  MESSAGES_VIEW: "messages.view",
  MESSAGES_DELETE: "messages.delete",

  // البلاغات
  REPORTS_VIEW: "reports.view",
  REPORTS_HANDLE: "reports.handle",

  // الإشعارات
  BROADCAST_SEND: "broadcast.send",
  BROADCAST_VIEW_HISTORY: "broadcast.view_history",

  // المحتوى
  CONTENT_EDIT: "content.edit", // CMS pages
  HOMEPAGE_EDIT: "homepage.edit", // بنرات، ترتيب
  BRANDS_EDIT: "brands.edit",
  CONTACT_INFO_EDIT: "contact_info.edit",

  // الإعدادات والميزات
  FEATURES_TOGGLE: "features.toggle",
  SETTINGS_EDIT: "settings.edit",

  // التحليلات
  ANALYTICS_VIEW: "analytics.view",
  ANALYTICS_EXPORT: "analytics.export",

  // النظام
  LOGS_VIEW: "logs.view",
  SYSTEM_MANAGE: "system.manage", // Super Admin فقط
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * صلاحيات كل دور. نستخدم prefixes مع "*" لتقليل التكرار.
 */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly (Permission | string)[]> = {
  super_admin: ["*"], // كل شيء، بما فيها role assignment + system

  admin: [
    "users.*",
    "listings.*",
    "comments.*",
    "messages.*",
    "reports.*",
    "broadcast.*",
    "content.*",
    "homepage.*",
    "brands.*",
    "contact_info.*",
    "features.*",
    "settings.*",
    "analytics.*",
    "logs.view",
    // ⚠️ بدون users.role_assign و system.manage - تلك للـSuper Admin فقط
  ],

  moderator: [
    "users.view",
    "users.ban",
    "listings.view",
    "listings.approve",
    "listings.reject",
    "listings.edit",
    "comments.delete",
    "reports.*",
    "logs.view",
  ],

  support: [
    "users.view",
    "users.edit",
    "users.verify",
    "listings.view",
    "messages.view",
    "reports.view",
    "reports.handle",
  ],

  analytics: ["analytics.*", "users.view", "listings.view", "logs.view"],
};

/**
 * Metadata معروضة للأدمن: التسمية والوصف للـUI.
 */
export const ROLE_METADATA: Record<
  AdminRole,
  { label: string; description: string; color: string }
> = {
  super_admin: {
    label: "مدير عام",
    description: "صلاحيات كاملة، بما فيها تعيين الأدوار وإدارة النظام",
    color: "bg-rose-500",
  },
  admin: {
    label: "أدمن",
    description: "إدارة كل المحتوى والمستخدمين، باستثناء تعيين الأدوار",
    color: "bg-action-500",
  },
  moderator: {
    label: "مشرف",
    description: "مراجعة الإعلانات والبلاغات وإدارة المحتوى",
    color: "bg-emerald-500",
  },
  support: {
    label: "دعم",
    description: "مساعدة المستخدمين، عرض البيانات وحلّ المشاكل",
    color: "bg-brand-600",
  },
  analytics: {
    label: "محلِّل",
    description: "عرض التقارير والإحصائيات فقط",
    color: "bg-slate-600",
  },
};

/** يُرجِع كل الأدوار كمصفوفة (للـdropdowns). */
export const ALL_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "analytics",
];
