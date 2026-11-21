"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AtSign,
  CirclePause,
  CirclePlay,
  Copy,
  Crown,
  ExternalLink,
  Flag,
  History,
  ImageOff,
  Loader2,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ROLE_METADATA, type AdminRole } from "@/lib/admin/roles";
import {
  ACTION_LABEL,
  CONTENT_NOUN,
  PROMO_FIELD_LABEL,
  fmtDateTime,
  fmtRemaining,
  publicContentHref,
  type ContentItem,
  type ContentType,
  type ModAction,
} from "@/lib/moderation/content";
import type { ModerateContentResult } from "@/lib/moderation/moderate-content";
import {
  fetchContentItem,
  fetchHistory,
  fetchOwnerInfo,
  type HistoryEntry,
  type OwnerInfo,
} from "./content-data";
import { PaidBadge, StatusBadge, TypeBadge } from "./content-badges";
import { ModerationActionDialog } from "./moderation-action-dialog";

interface Props {
  type: ContentType;
  id: string;
  reportId?: string | null;
  onClose: () => void;
  /** بعد إجراء ناجح: العنصر المحدَّث (أو null إن لم يعد موجوداً). */
  onChanged?: (type: ContentType, id: string, item: ContentItem | null) => void;
  /** «كل محتوى صاحب الحساب» — بحث بالـUID في الصفحة الأم. */
  onSearchOwner?: (uid: string) => void;
}

const roleLabel = (r: string) => ROLE_METADATA[r as AdminRole]?.label ?? (r || "—");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[13px]">
      <span className="shrink-0 font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 text-end font-semibold text-slate-800 dark:text-slate-100">{children}</span>
    </div>
  );
}

export function ContentPreviewDrawer({ type, id, reportId: initialReportId, onClose, onChanged, onSearchOwner }: Props) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [dialog, setDialog] = useState<ModAction | null>(null);
  const [reportId, setReportId] = useState<string | null>(initialReportId ?? null);
  const [copied, setCopied] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryError(false);
    try {
      setHistory(await fetchHistory(type, id));
    } catch {
      setHistory([]);
      setHistoryError(true);
    }
  }, [type, id]);

  const load = useCallback(async (): Promise<ContentItem | null> => {
    setState((s) => (s === "ok" ? s : "loading"));
    try {
      const it = await fetchContentItem(type, id);
      setItem(it);
      setState(it ? "ok" : "missing");
      if (it?.ownerId) {
        fetchOwnerInfo(it.ownerId)
          .then(setOwner)
          .catch(() => setOwner(null));
      }
      return it;
    } catch {
      setState("error");
      return null;
    }
  }, [type, id]);

  useEffect(() => {
    setItem(null);
    setOwner(null);
    setHistory(null);
    setState("loading");
    void load();
    void loadHistory();
  }, [load, loadHistory]);

  // قفل التمرير مرة واحدة طوال فتح المعاينة (منفصل عن ESC كي لا يُعاد حفظ قيمة "hidden").
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ESC يغلق المعاينة (إلا أثناء فتح حوار الإجراء — له ESC خاص).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dialog) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, onClose]);

  const handleDone = async (_res: ModerateContentResult) => {
    setDialog(null);
    setReportId(null); // البلاغ أُغلق مع أول إجراء ناجح.
    const it = await load();
    void loadHistory();
    onChanged?.(type, id, it);
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* المتصفح منع النسخ */
    }
  };

  const mod = item?.moderation ?? null;
  const modState = mod?.state ?? null;
  const actions: ModAction[] =
    modState === "removed" ? ["restore"] : modState === "paused" ? ["resume", "remove"] : type === "story" ? ["remove"] : ["remove", "pause"];
  const publicHref = publicContentHref(type, id);
  const now = Date.now();
  const frozen = mod?.state && mod.promoUntil
    ? Object.entries(mod.promoUntil).map(([field, until]) => ({
        field,
        label: PROMO_FIELD_LABEL[field] ?? field,
        remaining: until - (mod.sinceMs ?? now),
      }))
    : [];

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="معاينة المحتوى"
        dir="rtl"
        className="fixed inset-y-0 left-0 z-[95] flex w-full max-w-xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-950"
      >
        {/* الرأس */}
        <div className="flex items-start gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <TypeBadge type={type} />
              {item && <StatusBadge item={item} />}
              {item && <PaidBadge item={item} />}
            </div>
            <h2 className="mt-1.5 line-clamp-2 text-base font-black text-slate-900 dark:text-white">
              {item?.title ?? (state === "loading" ? "جارٍ التحميل…" : CONTENT_NOUN[type])}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              void load();
              void loadHistory();
            }}
            aria-label="تحديث"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {reportId && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-bold text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
              <Flag size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">
                مفتوح من بلاغ — سيُغلق البلاغ تلقائياً عند تنفيذ أي إجراء هنا.{" "}
                <Link href={`/admin/moderation/reports/${reportId}`} className="underline">
                  عرض البلاغ
                </Link>
              </span>
            </div>
          )}

          {state === "loading" && (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          )}

          {state === "missing" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              المحتوى غير موجود — ربما حذفه صاحبه نهائياً.
            </div>
          )}

          {state === "error" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
              تعذّر تحميل المحتوى.{" "}
              <button type="button" onClick={() => void load()} className="underline">
                إعادة المحاولة
              </button>
            </div>
          )}

          {state === "ok" && item && (
            <>
              {/* قرار الإدارة الحالي */}
              {mod && (
                <div
                  className={`rounded-2xl border p-4 text-[13px] leading-6 ${
                    mod.state === "removed"
                      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-100"
                      : mod.state === "paused"
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100"
                  }`}
                >
                  <p className="font-black">
                    {mod.state === "removed"
                      ? "محذوف من الإدارة (قابل للاستعادة)"
                      : mod.state === "paused"
                        ? "موقوف مؤقتاً من الإدارة"
                        : `آخر إجراء إداري: ${ACTION_LABEL[mod.action as ModAction] ?? mod.action}`}
                  </p>
                  {mod.state ? (
                    <p>
                      <b>السبب:</b> {mod.reason || "—"}
                      {mod.note ? ` — ${mod.note}` : ""}
                    </p>
                  ) : (
                    <>
                      {mod.lastReason && (
                        <p>
                          <b>السبب السابق:</b> {mod.lastReason}
                        </p>
                      )}
                      {mod.note && (
                        <p>
                          <b>الرسالة:</b> {mod.note}
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-[12px] opacity-80">
                    بواسطة {mod.byName || "أدمن"} ({roleLabel(mod.byRole)}) · {fmtDateTime(mod.atMs)}
                    {mod.state && mod.sinceMs && mod.atMs && mod.sinceMs !== mod.atMs
                      ? ` · تحت الإدارة منذ ${fmtDateTime(mod.sinceMs)}`
                      : ""}
                  </p>
                  <p className="text-[12px] opacity-80">
                    {mod.notified ? "أُشعر صاحب المحتوى." : "لم يُرسل إشعار لصاحب المحتوى."}
                    {mod.paid ? " · كان محتوى مدفوعاً وقت الإجراء." : ""}
                  </p>
                </div>
              )}

              {/* الإجراءات */}
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <ActionButton key={a} action={a} onClick={() => setDialog(a)} />
                ))}
                {publicHref && (
                  <Link
                    href={publicHref}
                    target="_blank"
                    className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <ExternalLink size={14} /> فتح في الموقع
                  </Link>
                )}
              </div>

              {/* الوسائط */}
              <Section title="الوسائط">
                {item.images.length === 0 && !item.videoUrl && !item.thumb ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <ImageOff size={16} /> لا توجد صور
                  </div>
                ) : (
                  <div className="space-y-2">
                    {item.videoUrl && (
                      <video
                        src={item.videoUrl}
                        controls
                        preload="metadata"
                        poster={item.thumb || undefined}
                        className="max-h-80 w-full rounded-xl bg-black"
                      />
                    )}
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {(item.images.length ? item.images : item.thumb ? [item.thumb] : []).slice(0, 12).map((src, i) => (
                        <a
                          key={`${src}-${i}`}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* التفاصيل */}
              <Section title="التفاصيل">
                {item.price !== null && <Row label="السعر">{formatPrice(item.price)}</Row>}
                {item.budget !== null && <Row label="الميزانية">{formatPrice(item.budget)}</Row>}
                {item.city && <Row label="المدينة">{item.city}</Row>}
                {item.category && <Row label="القسم">{item.category}</Row>}
                {item.type !== "story" && <Row label="الحالة المخزّنة">{item.status}</Row>}
                {mod?.prevStatus && mod.state && <Row label="الحالة قبل الإدارة">{mod.prevStatus}</Row>}
                <Row label="تاريخ النشر">{fmtDateTime(item.createdAtMs)}</Row>
                {item.type === "story" && <Row label="ينتهي">{fmtDateTime(item.expiresAtMs)}</Row>}
                {item.rejectionReason && <Row label="سبب الرفض">{item.rejectionReason}</Row>}
                {item.text && (
                  <p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-[13px] leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    {item.text}
                  </p>
                )}
              </Section>

              {/* الترويج */}
              {(item.promotions.length > 0 || frozen.length > 0 || mod?.promoRestored) && (
                <Section title="الترويج المدفوع">
                  {mod?.state ? (
                    frozen.length > 0 ? (
                      <ul className="space-y-1 text-[13px]">
                        {frozen.map((f) => (
                          <li key={f.field} className="flex items-center gap-2">
                            <Crown size={13} className="text-action-600" />
                            <b>{f.label}</b>
                            <span className="text-slate-500">
                              مجمّد — متبقٍ {fmtRemaining(f.remaining)}، يُعاد عند {mod.state === "paused" ? "الاستئناف" : "الاستعادة"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-slate-500">لا مدة ترويج مجمّدة.</p>
                    )
                  ) : (
                    <ul className="space-y-1 text-[13px]">
                      {item.promotions.map((p) => (
                        <li key={p.key} className="flex flex-wrap items-center gap-2">
                          <Crown size={13} className="text-action-600" />
                          <b>{p.label}</b>
                          <span className="text-slate-500">
                            {p.untilMs
                              ? `متبقٍ ${fmtRemaining(p.untilMs - now)} (حتى ${fmtDateTime(p.untilMs)})`
                              : "مفعّل بلا تاريخ انتهاء"}
                          </span>
                        </li>
                      ))}
                      {mod?.promoRestored && (
                        <li className="text-[12px] text-emerald-700 dark:text-emerald-300">
                          أُعيدت المدة المجمّدة عند آخر استعادة/استئناف.
                        </li>
                      )}
                    </ul>
                  )}
                </Section>
              )}

              {/* صاحب المحتوى */}
              <Section title="صاحب المحتوى">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    <UserIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
                    <p className="font-black text-slate-900 dark:text-white">
                      {owner?.name || item.ownerName || "—"}
                      {owner?.banned && <span className="ms-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">محظور</span>}
                      {owner?.disabled && <span className="ms-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700">معطّل</span>}
                    </p>
                    {owner?.username && (
                      <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300" dir="ltr">
                        <AtSign size={12} />
                        {owner.username}
                      </p>
                    )}
                    {(owner?.phone || item.phone) && (
                      <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Phone size={12} />
                        <span dir="ltr">{owner?.phone || item.phone}</span>
                      </p>
                    )}
                    {owner?.email && (
                      <p className="truncate text-[12px] text-slate-500" dir="ltr">
                        {owner.email}
                      </p>
                    )}
                    {!owner && item.ownerId && <p className="text-[12px] text-slate-400">تعذّر جلب الملف الكامل.</p>}
                  </div>
                </div>
                {item.ownerId && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/users/${item.ownerId}`}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[12px] font-black text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                    >
                      <UserIcon size={13} /> ملف المستخدم
                    </Link>
                    {onSearchOwner && (
                      <button
                        type="button"
                        onClick={() => onSearchOwner(item.ownerId)}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[12px] font-black text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Search size={13} /> كل محتوى صاحب الحساب
                      </button>
                    )}
                  </div>
                )}
              </Section>

              {/* السجل */}
              <Section title="سجلّ الإجراءات">
                {history === null ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : historyError ? (
                  <p className="text-[13px] font-bold text-rose-600">تعذّر تحميل السجل.</p>
                ) : history.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-[13px] text-slate-400">
                    <History size={14} /> لا توجد إجراءات إدارية مسجّلة على هذا المحتوى.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {history.map((h) => (
                      <li key={h.id} className="rounded-xl bg-slate-50 p-2.5 text-[12px] leading-5 dark:bg-slate-800/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-slate-900 dark:text-white">{h.label}</span>
                          <span className="text-slate-400">{fmtDateTime(h.atMs)}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          {h.adminName || "أدمن"}
                          {h.adminRole ? ` (${roleLabel(h.adminRole)})` : ""}
                          {h.reason ? ` — ${h.reason}` : ""}
                        </p>
                        <p className="text-slate-400">
                          {h.notified ? "أُشعر صاحبه" : "بلا إشعار"}
                          {h.paid ? " · مدفوع" : ""}
                          {h.reportId && (
                            <>
                              {" · "}
                              <Link href={`/admin/moderation/reports/${h.reportId}`} className="text-brand-700 underline dark:text-brand-300">
                                البلاغ
                              </Link>
                            </>
                          )}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              {/* تقني */}
              <Section title="معلومات تقنية">
                <Row label="المعرّف">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[11px]" dir="ltr">
                      {id}
                    </span>
                    <button type="button" onClick={() => void copyId()} aria-label="نسخ المعرّف" className="text-slate-400 hover:text-slate-700">
                      <Copy size={12} />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-600">نُسخ</span>}
                  </span>
                </Row>
                {item.ownerId && (
                  <Row label="UID صاحبه">
                    <span className="font-mono text-[11px]" dir="ltr">
                      {item.ownerId}
                    </span>
                  </Row>
                )}
              </Section>
            </>
          )}
        </div>
      </aside>

      {dialog && item && (
        <ModerationActionDialog
          target={{ type, id, title: item.title, paid: item.paid }}
          action={dialog}
          reportId={reportId}
          onClose={() => setDialog(null)}
          onDone={(res) => void handleDone(res)}
        />
      )}
    </>
  );
}

function ActionButton({ action, onClick }: { action: ModAction; onClick: () => void }) {
  const cfg = {
    remove: { label: "حذف (قابل للاستعادة)", Icon: Trash2, cls: "bg-rose-600 text-white hover:bg-rose-700" },
    pause: { label: "إيقاف مؤقت", Icon: CirclePause, cls: "bg-amber-500 text-white hover:bg-amber-600" },
    restore: { label: "استعادة", Icon: RotateCcw, cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
    resume: { label: "استئناف", Icon: CirclePlay, cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
  }[action];
  const Icon = cfg.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-2xl px-4 text-xs font-black shadow-sm transition active:scale-95 ${cfg.cls}`}
    >
      <Icon size={14} /> {cfg.label}
    </button>
  );
}
