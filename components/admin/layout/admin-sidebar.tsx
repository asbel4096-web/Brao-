"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Shield,
  Megaphone,
  FileText,
  Sparkles,
  Tag,
  Headphones,
  CreditCard,
  Flag,
  Settings,
  ShieldAlert,
  Wallet as WalletIcon,
  Users as UsersGroup,
  BarChart3,
  Image as ImageIcon,
  Wrench,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";

/**
 * Sidebar الأدمن - تصميم Linear/Vercel-inspired.
 *
 * - Glassmorphism خفيف (backdrop-blur على الخلفية)
 * - مجموعات منطقية مع separators
 * - كل link يفحص permission قبل العرض
 * - Active state واضح (خلفية + خط جانبي)
 * - قابل للطي على الديسكتوب (collapsed = أيقونات فقط)
 * - RTL ممتاز (الـborder/highlight على الجهة الصحيحة)
 *
 * mobile drawer منفصل (admin-mobile-nav.tsx).
 */

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Permission key مطلوبة لرؤية هذا الـlink. */
  permission?: string;
  /** Permissions متعدّدة (أي واحدة كافية). */
  anyPermissions?: string[];
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "نظرة عامة",
    links: [
      { href: "/admin", label: "اللوحة", Icon: LayoutDashboard },
      {
        href: "/admin/analytics",
        label: "التحليلات",
        Icon: BarChart3,
        permission: "analytics.view",
      },
    ],
  },
  {
    label: "المحتوى",
    links: [
      {
        href: "/admin/listings",
        label: "الإعلانات",
        Icon: ListChecks,
        permission: "listings.view",
      },
      {
        href: "/admin/featured-requests",
        label: "طلبات التمييز",
        Icon: Sparkles,
        permission: "listings.feature",
      },
    ],
  },
  {
    label: "المستخدمون",
    links: [
      {
        href: "/admin/users",
        label: "المستخدمون",
        Icon: Users,
        permission: "users.view",
      },
    ],
  },
  {
    label: "الإشراف",
    links: [
      {
        href: "/admin/moderation/reports",
        label: "البلاغات",
        Icon: Flag,
        permission: "reports.view",
      },
      {
        href: "/admin/moderation/banned-words",
        label: "الكلمات المحظورة",
        Icon: ShieldAlert,
        permission: "content.edit",
      },
    ],
  },
  {
    label: "الاتصال",
    links: [
      {
        href: "/admin/broadcast",
        label: "الإشعارات الجماعية",
        Icon: Megaphone,
        permission: "broadcast.send",
      },
    ],
  },
  {
    label: "إدارة الموقع",
    links: [
      {
        href: "/admin/brands",
        label: "شعارات الماركات",
        Icon: Tag,
        permission: "brands.edit",
      },
      {
        href: "/admin/contact-info",
        label: "معلومات التواصل",
        Icon: Headphones,
        permission: "contact_info.edit",
      },
      {
        href: "/admin/content/pages",
        label: "صفحات الموقع",
        Icon: FileText,
        permission: "content.edit",
      },
      {
        href: "/admin/content/homepage",
        label: "الصفحة الرئيسية",
        Icon: ImageIcon,
        permission: "homepage.edit",
      },
    ],
  },
  {
    label: "النظام",
    links: [
      {
        href: "/admin/settings/features",
        label: "Feature Flags",
        Icon: Wrench,
        permission: "features.toggle",
      },
      {
        href: "/admin/wallet",
        label: "إدارة المحافظ",
        Icon: WalletIcon,
        permission: "users.edit",
      },
      {
        href: "/admin/topup-requests",
        label: "طلبات الشحن",
        Icon: CreditCard,
        permission: "users.edit",
      },
      {
        href: "/admin/referrals",
        label: "نظام الإحالات",
        Icon: UsersGroup,
        permission: "users.edit",
      },
      {
        href: "/admin/subscriptions",
        label: "الاشتراكات",
        Icon: CreditCard,
        permission: "settings.edit",
      },
      {
        href: "/admin/system/logs",
        label: "سجلّ النشاطات",
        Icon: Shield,
        permission: "logs.view",
      },
      {
        href: "/admin/settings/roles",
        label: "الأدوار والصلاحيات",
        Icon: Settings,
        permission: "users.role_assign",
      },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (next: boolean) => void;
  /** Mobile mode: يستخدم نفس الـsidebar لكن full-width بلا collapse. */
  mobile?: boolean;
  /** Callback عند الضغط على link في mobile (لإغلاق الـdrawer). */
  onNavigate?: () => void;
}

export function AdminSidebar({
  collapsed = false,
  onCollapsedChange,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { can, role } = useAdminRole();

  // فلترة المجموعات: نُخفي مجموعة كاملة لو لا يستطيع المستخدم رؤية أي link فيها.
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    links: g.links.filter((l) => {
      if (!l.permission && !l.anyPermissions) return true; // عام للكل
      if (l.permission && !can(l.permission)) return false;
      if (l.anyPermissions && !l.anyPermissions.some((p) => can(p))) return false;
      return true;
    }),
  })).filter((g) => g.links.length > 0);

  const isCollapsed = collapsed && !mobile;

  return (
    <aside
      className={`
        flex h-full flex-col
        border-l border-slate-200/70 bg-white/95 backdrop-blur-md
        transition-[width] duration-200 ease-out
        dark:border-slate-800 dark:bg-slate-950/95
        ${isCollapsed ? "w-[68px]" : mobile ? "w-full" : "w-[240px]"}
      `}
    >
      {/* الـHeader مع toggle */}
      <div
        className={`
          flex h-14 items-center gap-2 border-b border-slate-200/70 px-3
          dark:border-slate-800
          ${isCollapsed ? "justify-center" : "justify-between"}
        `}
      >
        {!isCollapsed && (
          <Link
            href="/admin"
            prefetch={false}
            onClick={onNavigate}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-action-500 text-white shadow-sm">
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-black text-slate-900 dark:text-white">
                لوحة الإدارة
              </span>
              <span className="mt-0.5 text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500">
                BRATSHO ADMIN
              </span>
            </div>
          </Link>
        )}

        {/* زر طي/فتح - للديسكتوب فقط */}
        {!mobile && onCollapsedChange && (
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "فتح القائمة" : "طي القائمة"}
            className="
              grid h-8 w-8 place-items-center rounded-lg text-slate-400
              transition hover:bg-slate-100 hover:text-slate-700
              dark:hover:bg-slate-800 dark:hover:text-slate-200
            "
          >
            {/* في RTL، الـchevron يجب أن يدلّ على الجهة الصحيحة */}
            {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>

      {/* القائمة */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {visibleGroups.map((group, idx) => (
          <div key={group.label} className={idx > 0 ? "mt-4" : ""}>
            {/* Group label - يُخفى عند الطي */}
            {!isCollapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href));
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      onClick={onNavigate}
                      title={isCollapsed ? link.label : undefined}
                      className={`
                        group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2
                        text-[13px] font-bold transition
                        ${active
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        }
                        ${isCollapsed ? "justify-center" : ""}
                      `}
                    >
                      {/* مؤشّر جانبي للحالة النشطة (RTL: على اليمين) */}
                      {active && !isCollapsed && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-700 dark:bg-brand-300"
                        />
                      )}
                      <link.Icon
                        size={17}
                        strokeWidth={active ? 2.4 : 2}
                        className="shrink-0"
                      />
                      {!isCollapsed && (
                        <span className="truncate">{link.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer - رابط للعودة للموقع العام */}
      {!isCollapsed && (
        <div className="border-t border-slate-200/70 px-2 py-3 dark:border-slate-800">
          <Link
            href="/"
            prefetch={false}
            onClick={onNavigate}
            className="
              flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-bold
              text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
              dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
            "
          >
            ← العودة للموقع
          </Link>
        </div>
      )}
    </aside>
  );
}
