"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { libyaCities } from "@/lib/categories";
import { normalizeLibyanPhone } from "@/lib/utils";

/**
 * صفحة طلب توثيق معرض.
 *
 * - يجب أن يكون المستخدم مسجَّل دخول.
 * - يُرسل الطلب إلى dealerVerificationRequests بحالة "pending".
 * - بعد المراجعة من الأدمن (يدوياً من Firebase Console أو لاحقاً صفحة
 *   إدارة مخصّصة)، يضبط الأدمن isVerifiedDealer=true على المستخدم.
 * - يمنع تكرار الإرسال: لو يوجد طلب سابق pending أو approved للمستخدم،
 *   نُظهر رسالة بدلاً من النموذج.
 */
export default function DealerVerificationPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();

  const [existingStatus, setExistingStatus] = useState<
    "pending" | "approved" | null
  >(null);
  const [checking, setChecking] = useState(true);

  const [form, setForm] = useState({
    dealerName: "",
    contactName: "",
    city: "",
    phone: "",
    whatsapp: "",
    socialUrl: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /* ----- redirect غير المسجَّلين ----- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/dealer-verification");
    }
  }, [authLoading, user, router]);

  /* ----- ابحث عن طلب سابق ----- */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "dealerVerificationRequests"),
            where("userId", "==", user.uid),
            limit(5)
          )
        );
        if (cancelled) return;
        // ابحث عن أي طلب pending/approved لمنع التكرار. rejected لا يمنع.
        const blocking = snap.docs.find((d) => {
          const s = (d.data() as { status?: string }).status;
          return s === "pending" || s === "approved";
        });
        if (blocking) {
          const s = (blocking.data() as { status?: string }).status;
          setExistingStatus(s === "approved" ? "approved" : "pending");
        }
      } catch {
        // تجاهل صامت - نسمح بالإرسال إذا فشل الفحص.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ----- prefill من الـprofile ----- */
  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      contactName: prev.contactName || profile.name || "",
      city: prev.city || profile.city || "",
      phone: prev.phone || profile.phone || "",
      whatsapp: prev.whatsapp || profile.whatsapp || "",
    }));
  }, [profile]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!user) return;

    if (!form.dealerName.trim()) {
      toast.error("الرجاء إدخال اسم المعرض.");
      return;
    }
    if (!form.contactName.trim()) {
      toast.error("الرجاء إدخال اسم المسؤول.");
      return;
    }
    if (!form.city.trim()) {
      toast.error("الرجاء اختيار المدينة.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف.");
      return;
    }

    const payload: any = {
      userId: user.uid,
      userEmail: user.email || "",
      dealerName: form.dealerName.trim(),
      contactName: form.contactName.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
    };
    if (form.whatsapp.trim()) {
      payload.whatsapp = normalizeLibyanPhone(form.whatsapp.trim());
    }
    if (form.socialUrl.trim()) payload.socialUrl = form.socialUrl.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      setSubmitting(true);
      await addDoc(collection(db, "dealerVerificationRequests"), payload);
      toast.success("تم إرسال طلبك بنجاح.");
      setDone(true);
    } catch (err: any) {
      const msg =
        err?.code === "permission-denied"
          ? "Permission Denied. تأكد من نشر قواعد Firestore."
          : err?.message || "تعذّر إرسال الطلب.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ----- شاشات الحالة ----- */
  if (authLoading || (user && checking)) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }
  if (!user) return null;

  if (done || existingStatus === "pending") {
    return (
      <StatusCard
        title="طلبك قيد المراجعة"
        message="تلقّينا طلبك بنجاح. سنراجعه قريباً ونتواصل معك عند الموافقة."
      />
    );
  }
  if (existingStatus === "approved") {
    return (
      <StatusCard
        title="معرضك موثَّق مسبقاً"
        message="حسابك يظهر بالفعل في قسم المعارض الموثقة. شكراً لثقتك في براتشو كار."
        approved
      />
    );
  }

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* رأس */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="رجوع"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowRight size={18} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <BadgeCheck size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            وثّق معرضك في براتشو كار
          </h1>
        </div>

        {/* بطاقة دعوة فخمة */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-ink p-5 text-white shadow-blue sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-action-500/25 blur-3xl"
          />
          <div className="relative flex items-start gap-3">
            <Sparkles size={20} className="mt-0.5 shrink-0 text-action-400" />
            <p className="text-sm leading-7 text-white/90 sm:text-base sm:leading-8">
              ارفع ثقة العملاء بمعرضك واظهر ضمن{" "}
              <span className="font-black text-white">معارض السيارات الموثقة</span>{" "}
              في الصفحة الرئيسية مع شارة توثيق زرقاء بجانب اسمك.
            </p>
          </div>
        </div>

        {/* النموذج */}
        <div className="card space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>اسم المعرض</Label>
              <input
                className="input"
                placeholder="شركة الماسة للسيارات"
                value={form.dealerName}
                onChange={(e) => set("dealerName", e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <Label required>اسم المسؤول</Label>
              <input
                className="input"
                placeholder="الاسم الكامل"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>المدينة</Label>
              <select
                className="input"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">اختر المدينة</option>
                {libyaCities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label required>رقم الهاتف</Label>
              <input
                className="input"
                type="tel"
                placeholder="0911234567"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>رقم واتساب</Label>
              <input
                className="input"
                type="tel"
                placeholder="0911234567"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <Label>رابط صفحة/حساب المعرض</Label>
              <input
                className="input"
                type="url"
                placeholder="https://facebook.com/..."
                value={form.socialUrl}
                onChange={(e) => set("socialUrl", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <Label>ملاحظات إضافية</Label>
            <textarea
              className="input min-h-[90px] resize-y"
              placeholder="أخبرنا أكثر عن معرضك، عنوانه، عدد السيارات، إلخ."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={500}
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            بإرسال هذا الطلب، توافق على مراجعة فريق براتشو كار للمعلومات
            والاتصال بك للتحقق منها قبل التوثيق.
          </p>
        </div>

        {/* الأزرار */}
        <div className="flex gap-2">
          <Link
            href="/"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 text-sm font-black text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            إرسال الطلب
          </button>
        </div>
      </div>
    </section>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">
      {children}
      {required ? <span className="mr-1 text-rose-600">*</span> : null}
    </label>
  );
}

function StatusCard({
  title,
  message,
  approved,
}: {
  title: string;
  message: string;
  approved?: boolean;
}) {
  return (
    <section className="container py-10 pb-28">
      <div className="card mx-auto max-w-md p-8 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            approved
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {approved ? (
            <BadgeCheck size={32} strokeWidth={2.5} />
          ) : (
            <CheckCircle2 size={32} strokeWidth={2.5} />
          )}
        </div>
        <h1 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {message}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 px-6 text-sm font-black text-white shadow-blue transition hover:bg-brand-600"
        >
          العودة للرئيسية
        </Link>
      </div>
    </section>
  );
}
