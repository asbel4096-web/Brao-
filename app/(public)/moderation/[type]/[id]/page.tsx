"use client";

/**
 * قرار الإدارة على محتوى المستخدم — رابط إشعار moderation_* (/moderation/{type}/{id}).
 * يرى صاحب المحتوى (المسجّل) هل حُذف أو أوقف مؤقتاً، والسبب والتاريخ، أو أنه أُعيد.
 * لا يُعرض اسم المشرف. القراءة: الإعلان/المنشور يقرؤه صاحبه بأي حالة (القواعد)، والقصص عامة القراءة.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, Headphones, ImageOff, Loader2, ShieldCheck, ShieldX, CirclePause } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONTENT_COLLECTION,
  CONTENT_NOUN,
  CONTENT_TYPE_LABEL,
  displayStatus,
  fmtDateTime,
  isContentType,
  isPermissionDenied,
  ownerDecision,
  publicContentHref,
  statusLabel,
  toContentItem,
  type ContentItem,
  type ContentType,
} from "@/lib/moderation/content";

type ViewState = "loading" | "ok" | "missing" | "forbidden" | "invalid";

const TONE = {
  rose: {
    box: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100",
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
    Icon: ShieldX,
  },
  amber: {
    box: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
    Icon: CirclePause,
  },
  emerald: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    Icon: ShieldCheck,
  },
} as const;

export default function ModerationDecisionPage() {
  const params = useParams<{ type: string; id: string }>();
  const rawType = String(params?.type || "");
  const id = String(params?.id || "");
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [view, setView] = useState<ViewState>("loading");
  const [item, setItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isContentType(rawType) || !id || id.includes("/")) {
      setView("invalid");
      return;
    }
    const type: ContentType = rawType;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/moderation/${type}/${id}`)}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, CONTENT_COLLECTION[type], id));
        if (cancelled) return;
        if (!snap.exists()) {
          setView("missing");
          return;
        }
        const it = toContentItem(type, snap.id, snap.data());
        if (it.ownerId !== user.uid && !isAdmin) {
          setView("forbidden");
          return;
        }
        setItem(it);
        setView("ok");
      } catch (e) {
        if (!cancelled) setView(isPermissionDenied(e) ? "forbidden" : "missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdmin, rawType, id, router]);

  if (authLoading || view === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (view !== "ok" || !item) {
    const msg =
      view === "invalid"
        ? "الرابط غير صالح."
        : view === "forbidden"
          ? "هذه الصفحة متاحة لصاحب المحتوى فقط."
          : "لم يعد هذا المحتوى موجوداً — ربما حُذف نهائياً.";
    return (
      <section className="container flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">{msg}</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/contact" className="btn-primary">
            <Headphones size={16} /> تواصل مع الدعم
          </Link>
          <Link href="/" className="btn-secondary">
            الرئيسية
          </Link>
        </div>
      </section>
    );
  }

  const type = item.type;
  const mod = item.moderation;
  const decision = ownerDecision(type, mod);
  const tone = decision ? TONE[decision.tone] : null;
  const underModeration = mod?.state === "removed" || mod?.state === "paused";
  const st = displayStatus(item);
  const publicHref = publicContentHref(type, item.id);

  return (
    <section className="container py-6 pb-28 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href={type === "listing" ? "/my-listings" : "/notifications"}
          className="inline-flex items-center gap-1 text-sm font-black text-slate-600 dark:text-slate-300"
        >
          <ArrowRight size={16} />
          {type === "listing" ? "إعلاناتي" : "الإشعارات"}
        </Link>

        <div>
          <h1 className="section-title">قرار الإدارة</h1>
          <p className="section-subtitle">بخصوص {CONTENT_NOUN[type]} الخاص بك.</p>
        </div>

        {/* المحتوى */}
        <div className="card flex items-center gap-3 p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
            {item.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <ImageOff size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">{CONTENT_TYPE_LABEL[type]}</p>
            <p className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
            <p className="text-[11px] text-slate-500">الحالة الآن: {statusLabel(type, st)}</p>
          </div>
        </div>

        {/* القرار */}
        {decision && tone ? (
          <div className={`rounded-3xl border p-5 ${tone.box}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                <tone.Icon size={20} />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-sm leading-7">
                <h2 className="text-base font-black">{decision.title}</h2>
                <p>{decision.body}</p>
                {mod?.atMs && <p className="text-[12px] opacity-80">تاريخ القرار: {fmtDateTime(mod.atMs)}</p>}
                {!underModeration && mod?.lastReason && (
                  <p className="text-[12px] opacity-80">السبب السابق: {mod.lastReason}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-5 text-sm font-bold text-slate-600 dark:text-slate-300">
            لا يوجد قرار إداري على هذا المحتوى حالياً.
          </div>
        )}

        {underModeration && (
          <div className="card space-y-2 p-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
            <p className="font-black text-slate-900 dark:text-white">تعتقد أن القرار خاطئ؟</p>
            <p>
              راسل الدعم واذكر رقم المرجع أدناه، وسنراجع القرار. لا تنشر المحتوى نفسه مجدداً قبل الرد.
            </p>
            <p className="text-[12px]">
              رقم المرجع:{" "}
              <span className="font-mono text-[11px]" dir="ltr">
                {type}/{item.id}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/contact" className="btn-primary">
            <Headphones size={16} /> تواصل مع الدعم
          </Link>
          {!underModeration && publicHref && st === "approved" && (
            <Link href={publicHref} className="btn-secondary">
              عرض {CONTENT_NOUN[type]}
            </Link>
          )}
          {type === "listing" && (
            <Link href="/my-listings" className="btn-secondary">
              إعلاناتي
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
