"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/confirm-dialog";

/**
 * طلب حذف الحساب من الموقع — يستدعي requestAccountDeletion (نفس دالة التطبيق):
 * تعطيل فوري + حذف نهائي بعد 30 يوماً. الدالة تشترط دخولاً حديثاً (5 دقائق) وألّا يكون
 * في المحفظة رصيد، وتعيد رسالة عربية نعرضها كما هي.
 * بعد النجاح يسجّل AuthContext خروج المستخدم تلقائياً (الحساب صار معطّلاً)، لذا تُحفظ
 * رسالة النجاح في حالة هذا المكوّن.
 */

type Result = { ok?: boolean; already?: boolean; deletionScheduledFor?: string | null };
const RETURN_TO = "/delete-account";

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" });
}

export function DeleteAccountPanel() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, loading } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  const [done, setDone] = useState<{ date: string } | null>(null);

  const relogin = async () => {
    try {
      await signOut(auth);
    } catch {
      /* الخروج يكتمل على أي حال */
    }
    router.push(`/login?redirect=${encodeURIComponent(RETURN_TO)}`);
  };

  const submit = async () => {
    setError(null);
    setNeedsRelogin(false);
    const ok = await confirm({
      title: "حذف الحساب؟",
      message:
        "سيُعطَّل حسابك فوراً ويُحذف نهائياً بعد 30 يوماً. يمكنك التراجع خلال هذه المدة من تطبيق براتشو كار.",
      confirmLabel: "طلب حذف الحساب",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const call = httpsCallable<Record<string, never>, Result>(
        getFunctions(auth.app, "us-central1"),
        "requestAccountDeletion"
      );
      const res = await call({});
      setDone({ date: formatDate(res.data?.deletionScheduledFor) });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const code = String(err?.code || "");
      const msg = String(err?.message || "");
      if (code.endsWith("failed-precondition") && msg.includes("requires-recent-login")) {
        setNeedsRelogin(true);
        setError("لأمان حسابك، سجّل الدخول من جديد ثم اطلب الحذف خلال 5 دقائق.");
      } else if (code.endsWith("unauthenticated")) {
        setNeedsRelogin(true);
        setError("انتهت جلستك. سجّل الدخول من جديد.");
      } else if (code.endsWith("failed-precondition") && msg) {
        // مثل: «يوجد رصيد متبقٍ في المحفظة» — رسالة الخادم كما هي.
        setError(`${msg}. حوّل الرصيد أو اطلب مراجعة الإدارة من صفحة المحفظة، ثم أعد المحاولة.`);
      } else {
        setError("تعذّر إرسال الطلب الآن. تحقّق من اتصالك وحاول مجدداً.");
      }
    } finally {
      setBusy(false);
    }
  };

  const box =
    "mt-2 rounded-2xl border p-4 text-sm leading-7";

  if (done) {
    return (
      <div className={`${box} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-200`} role="status">
        <p className="font-black">تم استلام طلب حذف حسابك.</p>
        <p>
          عُطّل الحساب الآن وسُجّل خروجك
          {done.date ? `، وسيُحذف نهائياً في ${done.date}` : "، وسيُحذف نهائياً بعد 30 يوماً"}.
          للتراجع قبل ذلك سجّل الدخول من تطبيق براتشو كار واضغط «استعادة الحساب».
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className={`${box} border-slate-200 text-slate-500 dark:border-slate-800`}>جارٍ التحقق من تسجيل الدخول…</div>;
  }

  if (!user) {
    return (
      <div className={`${box} border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40`}>
        <p>لست مسجّلاً الدخول. سجّل الدخول بالحساب الذي تريد حذفه ثم ستعود إلى هذه الصفحة.</p>
        <Link href={`/login?redirect=${encodeURIComponent(RETURN_TO)}`} className="btn-primary mt-3 inline-flex">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className={`${box} border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-900/15`}>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-1.5 h-4 w-4 shrink-0 accent-rose-600"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>أفهم أن حسابي سيُعطَّل فوراً ويُحذف نهائياً بعد 30 يوماً مع البيانات المذكورة في هذه الصفحة.</span>
      </label>
      {error && (
        <p className="mt-3 font-bold text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {needsRelogin ? (
          <button type="button" onClick={relogin} className="btn-primary">
            تسجيل الدخول من جديد
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={!agree || busy} className="btn-danger disabled:opacity-50">
            {busy ? "جارٍ الإرسال…" : "طلب حذف الحساب"}
          </button>
        )}
      </div>
    </div>
  );
}
