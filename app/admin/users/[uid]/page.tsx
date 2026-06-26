"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Ban,
  BadgeCheck,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Users,
  Settings,
  Shield,
  Trash2,
  Undo2,
  User as UserIcon,
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useUserActions } from "@/hooks/admin/use-user-actions";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/contexts/ToastContext";
import { RoleBadge } from "@/components/admin/ui/role-badge";
import { BanUserDialog } from "@/components/admin/modules/users/ban-user-dialog";
import { RoleSelectorDialog } from "@/components/admin/modules/users/role-selector-dialog";
import { ROLE_METADATA, type AdminRole } from "@/lib/admin/roles";

/**
 * صفحة تفاصيل المستخدم - مع كل الإجراءات.
 *
 * تخطيط:
 *  - Header: الصورة + الاسم + الشارات (role/verified/banned)
 *  - معلومات: email, phone, city, joined date, last active
 *  - Actions: Ban/Unban, Verify/Unverify, Set Role, Delete
 *  - Footer: ID + bannedBy/banReason إن وُجد
 *
 * Realtime: نستخدم onSnapshot للحصول على تحديثات فورية بعد الإجراءات
 * (الحالة تتحدّث دون refresh).
 */

interface UserDoc {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  avatarUrl?: string;
  city?: string;
  businessName?: string;
  bio?: string;
  isAdmin?: boolean;
  role?: AdminRole | null;
  isVerifiedDealer?: boolean;
  verifiedAt?: any;
  verifiedBy?: string;
  followersCount?: number;
  banned?: boolean;
  bannedAt?: any;
  bannedBy?: string;
  banReason?: string;
  deleted?: boolean;
  deletedAt?: any;
  deleteReason?: string;
  createdAt?: any;
  lastActiveAt?: any;
}

function formatDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUserDetailPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const uid = params?.uid;

  const { user: currentUser } = useAuth();
  const { can, isSuperAdmin } = useAdminRole();
  const { ban, unban, verify, unverify, setRole, softDelete, busy } = useUserActions();
  const confirm = useConfirm();
  const toast = useToast();

  const handleResetFollowers = async () => {
    if (!uid) return;
    const ok = await confirm({
      title: "حذف كل المتابعين؟",
      message:
        "سيتم حذف جميع متابعي هذا المعرض وتصفير العدّاد. لا يمكن التراجع.",
      confirmLabel: "حذف المتابعين",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/engagement/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ type: "followers", id: uid }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التنفيذ");
      toast.success(`تم حذف ${data.removed} متابع.`);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر حذف المتابعين.");
    }
  };

  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Realtime
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setUser({ id: snap.id, ...(snap.data() as any) });
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[user-detail] error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  if (!can("users.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية عرض تفاصيل المستخدم.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <UserIcon
          size={36}
          className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
        />
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
          المستخدم غير موجود
        </p>
        <Link
          href="/admin/users"
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          العودة للقائمة
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const role = user.role || null;
  const displayName =
    user.name || user.businessName || user.email || "مستخدم بلا اسم";
  const photo = user.photoURL || user.avatarUrl;
  const initials = (displayName || "?").charAt(0).toUpperCase();
  const isSelf = currentUser?.uid === user.id;

  // Handlers
  const handleBanConfirm = async (reason: string) => {
    const ok = await ban(user.id, reason);
    if (ok) setBanDialogOpen(false);
  };

  const handleUnban = async () => {
    const ok = await confirm({
      title: "إلغاء حظر المستخدم؟",
      message: "سيُستعاد وصوله للمنصة وتعود إعلاناته المعتمدة للظهور.",
      confirmLabel: "إلغاء الحظر",
      tone: "info",
    });
    if (ok) await unban(user.id);
  };

  const handleVerify = async () => {
    const ok = await confirm({
      title: "توثيق المستخدم؟",
      message: "سيظهر بشارة موثَّق على صفحته وإعلاناته.",
      confirmLabel: "توثيق",
      tone: "info",
    });
    if (ok) await verify(user.id);
  };

  const handleUnverify = async () => {
    const ok = await confirm({
      title: "إلغاء التوثيق؟",
      message: "ستُزال شارة الموثَّق من حسابه.",
      confirmLabel: "إلغاء التوثيق",
      tone: "warning",
    });
    if (ok) await unverify(user.id);
  };

  const handleRoleSelect = async (newRole: AdminRole | null) => {
    const ok = await setRole(user.id, newRole);
    if (ok) setRoleDialogOpen(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "حذف الحساب؟",
      message: `هذا حذف soft - الحساب يبقى في قاعدة البيانات لكن يُمنع كل وصول وتُؤرشف إعلاناته. يمكن استعادته يدوياً لاحقاً.`,
      confirmLabel: "حذف الحساب",
      tone: "danger",
    });
    if (ok) {
      const result = await softDelete(user.id);
      if (result) router.push("/admin/users");
    }
  };

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowRight size={12} />
        العودة لقائمة المستخدمين
      </Link>

      {/* Header card */}
      <div
        className={`
          rounded-3xl border p-5 shadow-sm
          ${user.deleted
            ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
            : user.banned
            ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          }
        `}
      >
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500">
            {photo ? (
              <Image
                src={photo}
                alt={displayName}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-black text-white">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                {displayName}
              </h1>
              {user.isVerifiedDealer && (
                <BadgeCheck
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              )}
              <RoleBadge role={role} size="md" />
              {user.deleted && (
                <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[10px] font-black text-white">
                  محذوف
                </span>
              )}
              {user.banned && !user.deleted && (
                <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black text-white">
                  محظور
                </span>
              )}
            </div>

            {user.bio && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {user.bio}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              {user.email && (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <Mail size={11} />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <Phone size={11} />
                  {user.phone}
                </span>
              )}
              {user.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {user.city}
                </span>
              )}
              {user.createdAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} />
                  {formatDate(user.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ban reason banner */}
        {user.banned && user.banReason && !user.deleted && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-3 dark:border-rose-900/40 dark:bg-slate-900">
            <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
              سبب الحظر
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {user.banReason}
            </p>
            {user.bannedAt && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                {formatDate(user.bannedAt)}
              </p>
            )}
          </div>
        )}

        {/* Delete reason */}
        {user.deleted && user.deleteReason && (
          <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              سبب الحذف
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {user.deleteReason}
            </p>
            {user.deletedAt && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                {formatDate(user.deletedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Role description (لو يحمل دور) */}
      {role && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/40 dark:bg-brand-900/20">
          <div className="flex items-start gap-2">
            <Shield
              size={16}
              className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300"
            />
            <div>
              <p className="text-sm font-black text-brand-900 dark:text-brand-100">
                {ROLE_METADATA[role].label}
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-brand-700 dark:text-brand-200">
                {ROLE_METADATA[role].description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!user.deleted && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            الإجراءات
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Ban / Unban */}
            {can("users.ban") && !isSelf && (
              <>
                {user.banned ? (
                  <ActionButton
                    icon={Undo2}
                    label="إلغاء الحظر"
                    description="إعادة تفعيل الحساب واستعادة إعلاناته"
                    onClick={handleUnban}
                    disabled={busy !== null}
                    tone="emerald"
                  />
                ) : (
                  <ActionButton
                    icon={Ban}
                    label="حظر المستخدم"
                    description="منع التسجيل + إخفاء الإعلانات"
                    onClick={() => setBanDialogOpen(true)}
                    disabled={busy !== null}
                    tone="rose"
                  />
                )}
              </>
            )}

            {/* Verify / Unverify */}
            {can("users.verify") && (
              <>
                {user.isVerifiedDealer ? (
                  <ActionButton
                    icon={BadgeCheck}
                    label="إلغاء التوثيق"
                    description="إزالة شارة الموثَّق"
                    onClick={handleUnverify}
                    disabled={busy !== null}
                    tone="amber"
                  />
                ) : (
                  <ActionButton
                    icon={BadgeCheck}
                    label="توثيق الحساب"
                    description="إضافة شارة موثَّق"
                    onClick={handleVerify}
                    disabled={busy !== null}
                    tone="emerald"
                  />
                )}
              </>
            )}

            {/* Set role - super admin only */}
            {isSuperAdmin && (
              <ActionButton
                icon={Settings}
                label={role ? "تغيير الدور" : "تعيين دور أدمن"}
                description="إدارة صلاحيات هذا المستخدم"
                onClick={() => setRoleDialogOpen(true)}
                disabled={busy !== null}
                tone="brand"
              />
            )}

            {/* Delete */}
            {can("users.delete") && !isSelf && (
              <ActionButton
                icon={Trash2}
                label="حذف الحساب"
                description="Soft delete - يمكن استعادته يدوياً"
                onClick={handleDelete}
                disabled={busy !== null}
                tone="rose"
              />
            )}
            {can("users.edit") &&
              (user.isVerifiedDealer || (user.followersCount ?? 0) > 0) && (
                <ActionButton
                  icon={Users}
                  label="حذف المتابعين"
                  description={`تصفير المتابعين (${user.followersCount || 0})`}
                  onClick={handleResetFollowers}
                  disabled={busy !== null}
                  tone="rose"
                />
              )}
          </div>
          {isSelf && (
            <p className="mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              لا يمكنك تنفيذ إجراءات على حسابك الشخصي.
            </p>
          )}
        </section>
      )}

      {/* Metadata footer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11px] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          معلومات تقنية
        </h3>
        <dl className="space-y-1.5 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between gap-2">
            <dt>المعرّف (UID)</dt>
            <dd className="truncate font-mono text-[10px]" dir="ltr">
              {user.id}
            </dd>
          </div>
          {user.lastActiveAt && (
            <div className="flex justify-between gap-2">
              <dt>آخر نشاط</dt>
              <dd>{formatDate(user.lastActiveAt)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Dialogs */}
      <BanUserDialog
        open={banDialogOpen}
        userName={displayName}
        busy={busy === "ban"}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanDialogOpen(false)}
      />
      <RoleSelectorDialog
        open={roleDialogOpen}
        userName={displayName}
        currentRole={role}
        busy={busy === "role"}
        onSelect={handleRoleSelect}
        onCancel={() => setRoleDialogOpen(false)}
      />
    </div>
  );
}

/** Action button card. */
function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
  tone,
}: {
  icon: any;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "rose" | "emerald" | "amber" | "brand";
}) {
  const tones = {
    rose: {
      icon: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
      hover: "hover:border-rose-300 dark:hover:border-rose-700",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
      hover: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
      hover: "hover:border-amber-300 dark:hover:border-amber-700",
    },
    brand: {
      icon: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
      hover: "hover:border-brand-300 dark:hover:border-brand-700",
    },
  };
  const t = tones[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3
        text-right transition
        ${t.hover}
        dark:border-slate-800 dark:bg-slate-900
        disabled:cursor-not-allowed disabled:opacity-50
        enabled:active:scale-[0.99]
      `}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.icon}`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </button>
  );
}
