"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Ban,
  MoreVertical,
  User as UserIcon,
  Users,
} from "lucide-react";
import { RoleBadge } from "@/components/admin/ui/role-badge";
import type { AdminUser } from "@/hooks/admin/use-users-list";
import type { AdminRole } from "@/lib/admin/roles";

/**
 * جدول المستخدمين - يدعم mobile (cards) + desktop (table).
 *
 * كل صف يحوي:
 *  - صورة + اسم + email/phone
 *  - role badge
 *  - شارات verified/banned/deleted
 *  - زر "تفاصيل" (يفتح صفحة المستخدم)
 *
 * الإجراءات (ban/verify/role) موجودة في صفحة التفاصيل، لتجنّب
 * dialogs مفتوحة من جدول طويل ولأن الأدمن عادة يحتاج رؤية المعلومات
 * الكاملة قبل أي إجراء.
 */

interface Props {
  items: AdminUser[];
  loading: boolean;
}

function formatDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UsersTable({ items, loading }: Props) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <UserIcon
          size={36}
          className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
        />
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
          لا يوجد مستخدمون يطابقون البحث
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const role = (user.role as AdminRole | undefined) || null;
  const displayName = user.name || user.businessName || user.email || "—";
  const photo = user.photoURL || user.avatarUrl;
  const initials = (displayName || "?").charAt(0).toUpperCase();

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="
        group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3
        transition hover:border-brand-300 hover:shadow-sm
        dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      {/* صورة */}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-brand-500">
        {photo ? (
          <Image
            src={photo}
            alt={displayName}
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-black text-white">
            {initials}
          </div>
        )}
        {/* مؤشّر صغير على الصورة لو محظور */}
        {user.banned && (
          <div className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900">
            <Ban size={9} className="text-white" />
          </div>
        )}
      </div>

      {/* المعلومات */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-black text-slate-900 dark:text-white">
            {displayName}
          </span>
          {user.isVerifiedDealer && (
            <BadgeCheck
              size={14}
              className="shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          )}
          <RoleBadge role={role} />
          {user.deleted && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              محذوف
            </span>
          )}
          {user.banned && !user.deleted && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">
              محظور
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] text-slate-500 dark:text-slate-400">
          {user.email && (
            <span dir="ltr" className="truncate">
              {user.email}
            </span>
          )}
          {user.phone && (
            <>
              <span aria-hidden="true">·</span>
              <span dir="ltr">{user.phone}</span>
            </>
          )}
          {user.createdAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>انضم {formatDate(user.createdAt)}</span>
            </>
          )}
          {(user.isVerifiedDealer || (user.followersCount ?? 0) > 0) && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Users size={11} />
                {user.followersCount || 0} متابع
              </span>
            </>
          )}
        </div>
      </div>

      {/* chevron / more */}
      <div className="shrink-0 text-slate-400 transition group-hover:text-brand-700 dark:text-slate-500 dark:group-hover:text-brand-300">
        <MoreVertical size={16} />
      </div>
    </Link>
  );
}
