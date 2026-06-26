"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  Megaphone,
  Sparkles,
  Wrench,
  Tag,
  Bell,
  Send,
  AlertCircle,
  CheckCircle2,
  History,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { auth } from "@/lib/firebase";
import { BROADCAST_TYPES, type BroadcastTypeKey } from "@/lib/types";

interface BroadcastResult {
  recipientCount: number;
  pushSent: number;
  pushFailed: number;
  capped?: string;
}

// خرائط الأيقونات والألوان حسب النوع. lucide icons لا نُسنّفها بنوع مخصّص
// لتجنّب أخطاء build (`ComponentType` لا يتطابق مع `LucideIcon`).
const ICON_FOR: Record<BroadcastTypeKey, typeof Sparkles> = {
  broadcast_featured: Sparkles,
  broadcast_service: Wrench,
  broadcast_campaign: Tag,
  broadcast_general: Bell,
};

const BG_FOR: Record<BroadcastTypeKey, string> = {
  broadcast_featured: "bg-action-500",
  broadcast_service: "bg-emerald-500",
  broadcast_campaign: "bg-rose-500",
  broadcast_general: "bg-brand-700",
};

const TEXT_FOR: Record<BroadcastTypeKey, string> = {
  broadcast_featured: "text-action-700 dark:text-action-300",
  broadcast_service: "text-emerald-700 dark:text-emerald-300",
  broadcast_campaign: "text-rose-700 dark:text-rose-300",
  broadcast_general: "text-brand-700 dark:text-brand-300",
};

export default function AdminBroadcastPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [type, setType] = useState<BroadcastTypeKey>("broadcast_general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [segment, setSegment] = useState<
    "all" | "verified" | "dealers" | "showrooms" | "user"
  >("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);

  if (authLoading) {
    return (
      <div className="container py-10 text-center text-slate-500">
        جارٍ التحميل...
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return (
      <div className="container py-10 text-center text-slate-500">
        لا تملك صلاحية الوصول إلى هذه الصفحة.
      </div>
    );
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const trimmedLink = link.trim();
  const trimmedTarget = targetUserId.trim();
  const trimmedImage = imageUrl.trim();

  const SEGMENT_LABELS: Record<string, string> = {
    all: "كل المستخدمين",
    verified: "كل الموثّقين",
    dealers: "التجار الموثّقون",
    showrooms: "المعارض الموثّقة",
    user: "مستخدم محدّد",
  };

  const canSubmit =
    trimmedTitle.length >= 3 &&
    trimmedTitle.length <= 100 &&
    trimmedBody.length >= 5 &&
    trimmedBody.length <= 500 &&
    (segment !== "user" || trimmedTarget.length > 0) &&
    (!trimmedImage || trimmedImage.startsWith("https://")) &&
    !sending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const ok = await confirm({
      title: `إرسال الإشعار إلى: ${SEGMENT_LABELS[segment]}؟`,
      message: `سيصل هذا الإشعار لجميع مستخدمي براتشو كار. لا يمكن التراجع.\n\nالعنوان: "${trimmedTitle}"`,
      confirmLabel: "إرسال الآن",
      tone: "warning",
    });
    if (!ok) return;

    setSending(true);
    setLastResult(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("يجب تسجيل الدخول.");
        return;
      }

      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          body: trimmedBody,
          type,
          link: trimmedLink || undefined,
          segment,
          targetUserId: segment === "user" ? trimmedTarget : undefined,
          imageUrl: trimmedImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "تعذّر إرسال الإشعار.");
        return;
      }

      setLastResult({
        recipientCount: data.recipientCount || 0,
        pushSent: data.pushSent || 0,
        pushFailed: data.pushFailed || 0,
        capped: data.capped,
      });
      toast.success(
        `تم الإرسال إلى ${data.recipientCount} مستخدم (push: ${data.pushSent}).`
      );

      setTitle("");
      setBody("");
      setLink("");
      setTargetUserId("");
      setImageUrl("");
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ غير متوقّع.");
    } finally {
      setSending(false);
    }
  };

  const PreviewIcon = ICON_FOR[type];

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* العنوان */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
            <Megaphone size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              إرسال إشعار لكل المستخدمين
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              يصل الإشعار لجميع مسجّلي براتشو كار، داخل التطبيق + push للجوال.
            </p>
          </div>
        </div>
        <NextLink
          href="/admin/broadcast/history"
          className="
            inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl
            border border-slate-200 bg-white px-4 text-xs font-black
            text-slate-700 transition hover:bg-slate-50
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
            dark:hover:bg-slate-800
          "
        >
          <History size={14} />
          السجلّ
        </NextLink>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        {/* تحذير */}
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <p className="text-[12px] leading-6 text-amber-800 dark:text-amber-200">
            استخدم هذه الميزة بحكمة. الإشعارات المتكررة تؤدي إلى إيقاف
            المستخدمين للإشعارات.
          </p>
        </div>

        {/* نوع الـbroadcast */}
        <div className="card p-4 sm:p-5">
          <label className="mb-3 block text-sm font-black text-slate-900 dark:text-white">
            نوع الإشعار
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BROADCAST_TYPES.map((t) => {
              const Icon = ICON_FOR[t.key];
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`
                    relative flex flex-col items-center gap-1.5 rounded-2xl border p-3
                    text-center transition
                    ${active
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:border-brand-400 dark:bg-brand-900/30"
                      : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700"
                    }
                  `}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${BG_FOR[t.key]}`}
                  >
                    <Icon size={16} />
                  </div>
                  <span
                    className={`text-[11px] font-black ${
                      active ? TEXT_FOR[t.key] : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {BROADCAST_TYPES.find((t) => t.key === type)?.description}
          </p>
        </div>

        {/* النموذج */}
        <div className="card p-4 sm:p-5">
          {/* العنوان */}
          <div className="mb-4">
            <label
              htmlFor="bc-title"
              className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white"
            >
              العنوان
              <span className="ms-1 text-rose-500">*</span>
            </label>
            <input
              id="bc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="مثال: تويوتا كامري 2023 موديل جديد!"
              disabled={sending}
              className="
                w-full rounded-2xl border border-slate-200 bg-white px-4 py-3
                text-sm outline-none transition focus:border-brand-400
                dark:border-slate-700 dark:bg-slate-900
                disabled:opacity-60
              "
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>3-100 حرف</span>
              <span className="tabular-nums">{trimmedTitle.length}/100</span>
            </div>
          </div>

          {/* النص */}
          <div className="mb-4">
            <label
              htmlFor="bc-body"
              className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white"
            >
              النص
              <span className="ms-1 text-rose-500">*</span>
            </label>
            <textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="مثال: تم تمييز إعلان جديد بسعر استثنائي. شاهد التفاصيل الآن!"
              disabled={sending}
              className="
                w-full resize-none rounded-2xl border border-slate-200 bg-white
                px-4 py-3 text-sm outline-none transition focus:border-brand-400
                dark:border-slate-700 dark:bg-slate-900
                disabled:opacity-60
              "
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>5-500 حرف</span>
              <span className="tabular-nums">{trimmedBody.length}/500</span>
            </div>
          </div>

          {/* الرابط (اختياري) */}
          <div>
            <label
              htmlFor="bc-link"
              className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white"
            >
              <LinkIcon size={12} className="me-1 inline" />
              رابط عند الضغط (اختياري)
            </label>
            <input
              id="bc-link"
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/listings/abc123 أو /tow-trucks"
              disabled={sending}
              dir="ltr"
              className="
                w-full rounded-2xl border border-slate-200 bg-white px-4 py-3
                text-sm outline-none transition focus:border-brand-400
                dark:border-slate-700 dark:bg-slate-900
                disabled:opacity-60
              "
            />
            <p className="mt-1 text-[11px] text-slate-500">
              عند الضغط على الإشعار، سيُفتح هذا المسار. اتركه فارغاً ليفتح
              قائمة الإشعارات.
            </p>
          </div>

          {/* الشريحة المستهدفة */}
          <div>
            <label className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white">
              الشريحة المستهدفة
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as any)}
              disabled={sending}
              className="
                w-full rounded-2xl border border-slate-200 bg-white px-4 py-3
                text-sm outline-none transition focus:border-brand-400
                dark:border-slate-700 dark:bg-slate-900 disabled:opacity-60
              "
            >
              <option value="all">كل المستخدمين</option>
              <option value="verified">كل الموثّقين</option>
              <option value="dealers">التجار الموثّقون</option>
              <option value="showrooms">المعارض الموثّقة</option>
              <option value="user">مستخدم محدّد</option>
            </select>
          </div>

          {segment === "user" && (
            <div>
              <label
                htmlFor="bc-target"
                className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white"
              >
                معرّف المستخدم (UID)
              </label>
              <input
                id="bc-target"
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="uid المستخدم المستهدف"
                disabled={sending}
                dir="ltr"
                className="
                  w-full rounded-2xl border border-slate-200 bg-white px-4 py-3
                  text-sm outline-none transition focus:border-brand-400
                  dark:border-slate-700 dark:bg-slate-900 disabled:opacity-60
                "
              />
            </div>
          )}

          {/* صورة الإشعار (اختياري) */}
          <div>
            <label
              htmlFor="bc-image"
              className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white"
            >
              رابط صورة الإشعار (اختياري)
            </label>
            <input
              id="bc-image"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              disabled={sending}
              dir="ltr"
              className="
                w-full rounded-2xl border border-slate-200 bg-white px-4 py-3
                text-sm outline-none transition focus:border-brand-400
                dark:border-slate-700 dark:bg-slate-900 disabled:opacity-60
              "
            />
            <p className="mt-1 text-[11px] text-slate-500">
              صورة كبيرة تظهر داخل الإشعار. يجب أن تبدأ بـ https://
            </p>
          </div>
        </div>

        {/* معاينة */}
        {(trimmedTitle || trimmedBody) && (
          <div className="card p-4 sm:p-5">
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              معاينة الإشعار
            </h3>
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${BG_FOR[type]}`}
              >
                <PreviewIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white">
                  {trimmedTitle || "العنوان..."}
                </p>
                <p className="mt-0.5 line-clamp-3 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
                  {trimmedBody || "النص..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* زر الإرسال */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="
            flex w-full items-center justify-center gap-2 rounded-2xl
            bg-action-500 px-6 py-4 text-base font-black text-white
            shadow-action transition
            hover:bg-action-600 active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {sending ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جارٍ الإرسال...
            </>
          ) : (
            <>
              <Send size={18} />
              إرسال لكل المستخدمين
            </>
          )}
        </button>

        {/* نتيجة آخر broadcast */}
        {lastResult && (
          <div className="card border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                تم الإرسال بنجاح
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="مستخدم وصل" value={lastResult.recipientCount} />
              <Stat
                label="push نجح"
                value={lastResult.pushSent}
                accent="emerald"
              />
              <Stat
                label="push فشل"
                value={lastResult.pushFailed}
                accent={lastResult.pushFailed > 0 ? "rose" : "slate"}
              />
            </div>
            {lastResult.capped && (
              <p className="mt-3 text-[11px] text-amber-800 dark:text-amber-200">
                ⚠️ {lastResult.capped}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "slate" | "emerald" | "rose";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : accent === "rose"
      ? "text-rose-700 dark:text-rose-300"
      : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>
        {value.toLocaleString("ar-LY")}
      </p>
    </div>
  );
}
