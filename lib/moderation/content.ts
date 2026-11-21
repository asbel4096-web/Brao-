import type { DocumentData } from "firebase/firestore";

/**
 * «إدارة المحتوى» — نموذج مشترك (بلا استدعاءات شبكة) بين لوحة الأدمن وصفحات صاحب المحتوى.
 *
 * الخادم (الدالة moderateContent في مستودع التطبيق) هو المصدر الوحيد لكتابة الحذف/الإيقاف/الاستعادة:
 *  - الإعلانات والمنشورات: status = "removed" | "paused" + خريطة moderation.
 *  - القصص: hidden = true + expiresAt = الآن + خريطة moderation.
 * القواعد تمنع أي عميل (حتى الأدمن) من كتابة moderation، ومن تغيير الحالة أثناء الإدارة.
 * هذا الملف يقرأ تلك الحقول ويعرضها فقط، ويطابق منطق الخادم في «المحتوى المدفوع».
 */

export type ContentType = "listing" | "post" | "story";
export type ModAction = "remove" | "pause" | "restore" | "resume";
export type ModerationState = "removed" | "paused";

export const CONTENT_TYPES: ContentType[] = ["listing", "post", "story"];

export function isContentType(v: unknown): v is ContentType {
  return v === "listing" || v === "post" || v === "story";
}

export const CONTENT_COLLECTION: Record<ContentType, string> = {
  listing: "listings",
  post: "posts",
  story: "stories",
};

export const CONTENT_OWNER_FIELD: Record<ContentType, string> = {
  listing: "ownerId",
  post: "authorId",
  story: "ownerId",
};

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  listing: "إعلان",
  post: "منشور",
  story: "قصة",
};

/** «إعلانك/منشورك/قصتك» — لصاحب المحتوى. */
export const OWNER_NOUN: Record<ContentType, string> = {
  listing: "إعلانك",
  post: "منشورك",
  story: "قصتك",
};

/** «الإعلان/المنشور/القصة». */
export const CONTENT_NOUN: Record<ContentType, string> = {
  listing: "الإعلان",
  post: "المنشور",
  story: "القصة",
};

/** أسباب الحذف/الإيقاف — نفس المفاتيح والتسميات في الخادم (MODERATION_REASONS). */
export const MODERATION_REASONS: { code: string; label: string }[] = [
  { code: "spam", label: "محتوى مزعج أو متكرر (سبام)" },
  { code: "fraud", label: "احتيال أو محاولة نصب" },
  { code: "prohibited", label: "سلعة أو خدمة ممنوعة" },
  { code: "offensive", label: "محتوى مسيء أو غير لائق" },
  { code: "misleading", label: "معلومات أو صور مضللة" },
  { code: "wrong_category", label: "قسم غير مناسب" },
  { code: "duplicate", label: "محتوى مكرر" },
  { code: "copyright", label: "صور أو محتوى منسوخ دون إذن" },
  { code: "owner_request", label: "بطلب من صاحب المحتوى" },
  { code: "other", label: "سبب آخر" },
];

export function reasonLabel(code?: string | null): string {
  if (!code) return "";
  return MODERATION_REASONS.find((r) => r.code === code)?.label ?? code;
}

export const ACTION_LABEL: Record<ModAction, string> = {
  remove: "حذف (قابل للاستعادة)",
  pause: "إيقاف مؤقت",
  restore: "استعادة",
  resume: "استئناف",
};

/** تسميات سجلات adminLogs التي تكتبها moderateContent. */
export const CONTENT_LOG_LABELS: Record<string, string> = {
  content_remove: "حذف (قابل للاستعادة)",
  content_pause: "إيقاف مؤقت",
  content_restore: "استعادة",
  content_resume: "استئناف",
};

/** نتيجة البلاغ بعد إجراء من «إدارة المحتوى» (reports.resolution). */
export const CONTENT_RESOLUTION_LABELS: Record<string, string> = {
  content_removed: "حذف المحتوى (قابل للاستعادة)",
  content_paused: "إيقاف المحتوى مؤقتاً",
  content_restore: "استعادة المحتوى",
  content_resume: "استئناف المحتوى",
};

// ------------------------------------------------------------------
// أدوات وقت
// ------------------------------------------------------------------

/**
 * يقبل كل أشكال التاريخ الموجودة فعلاً في الإنتاج (فحص 2026-11-21):
 * Timestamp، أو {seconds, nanoseconds} / {_seconds}، أو Date، أو رقماً (مللي أو ثوانٍ مثل createdTs)،
 * أو نص ISO يبدأ بـ YYYY-MM-DD. أي نص آخر (مثل "null") = لا تاريخ.
 */
export function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return !Number.isFinite(v) ? null : v >= 1e11 ? v : v >= 1e9 ? v * 1000 : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return null;
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? ms : null;
  }
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null;
  if (typeof v === "object") {
    const o = v as { toMillis?: () => number; seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
    if (typeof o.toMillis === "function") {
      try {
        return o.toMillis();
      } catch {
        return null;
      }
    }
    const sec = typeof o.seconds === "number" ? o.seconds : typeof o._seconds === "number" ? o._seconds : null;
    if (sec !== null) {
      const ns = typeof o.nanoseconds === "number" ? o.nanoseconds : typeof o._nanoseconds === "number" ? o._nanoseconds : 0;
      return sec * 1000 + Math.floor(ns / 1e6);
    }
  }
  return null;
}

export function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const n = (v: number) => v.toLocaleString("ar-LY");

/** «3 يوم و4 ساعة» / «5 ساعة» / «20 دقيقة». */
export function fmtRemaining(ms: number): string {
  if (ms <= 0) return "انتهت";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return h > 0 ? `${n(d)} يوم و${n(h)} ساعة` : `${n(d)} يوم`;
  if (h > 0) return m > 0 ? `${n(h)} ساعة و${n(m)} دقيقة` : `${n(h)} ساعة`;
  return m > 0 ? `${n(m)} دقيقة` : "أقل من دقيقة";
}

// ------------------------------------------------------------------
// moderation map
// ------------------------------------------------------------------

export interface ContentModeration {
  /** "removed" | "paused" أثناء الإدارة؛ null بعد الاستعادة/الاستئناف. */
  state: ModerationState | null;
  action: string;
  reasonCode: string;
  reason: string;
  note: string;
  by: string;
  byName: string;
  byRole: string;
  atMs: number | null;
  sinceMs: number | null;
  prevStatus: string | null;
  paid: boolean;
  notified: boolean;
  lastState: string | null;
  lastReason: string;
  /** مدد الترويج المجمّدة (مللي) — للإعلانات. */
  promoUntil: Record<string, number>;
  promoRestored: Record<string, number> | null;
}

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const ms = toMillis(val);
      if (ms !== null) out[k] = ms;
    }
  }
  return out;
}

export function parseModeration(raw: unknown): ContentModeration | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const st = m.state === "removed" || m.state === "paused" ? (m.state as ModerationState) : null;
  const restored = numMap(m.promoRestored);
  return {
    state: st,
    action: s(m.action),
    reasonCode: s(m.reasonCode),
    reason: s(m.reason) || reasonLabel(s(m.reasonCode)),
    note: s(m.note),
    by: s(m.by),
    byName: s(m.byName),
    byRole: s(m.byRole),
    atMs: toMillis(m.at),
    sinceMs: toMillis(m.since),
    prevStatus: typeof m.prevStatus === "string" ? m.prevStatus : null,
    paid: m.paid === true,
    notified: m.notified === true,
    lastState: typeof m.lastState === "string" ? m.lastState : null,
    lastReason: s(m.lastReason),
    promoUntil: numMap(m.promoUntil),
    promoRestored: Object.keys(restored).length ? restored : null,
  };
}

/** المحتوى تحت الإدارة الآن (محذوف/موقوف) — القواعد تمنع تغيير حالته من العميل. */
export function moderationStateOf(d: DocumentData | null | undefined): ModerationState | null {
  return parseModeration(d?.moderation)?.state ?? null;
}

// ------------------------------------------------------------------
// الترويج المدفوع (مطابق للخادم isPaidContent / listingActivePromo)
// ------------------------------------------------------------------

export const LISTING_PROMO_FIELDS: { field: string; flag: string; label: string }[] = [
  { field: "featuredUntil", flag: "featured", label: "مميز" },
  { field: "boostedUntil", flag: "boosted", label: "تعزيز" },
  { field: "vipUntil", flag: "vip", label: "VIP" },
  { field: "urgentUntil", flag: "urgent", label: "عاجل" },
  { field: "pinnedUntil", flag: "isPinned", label: "مثبّت" },
  { field: "sponsoredUntil", flag: "isSponsored", label: "ممول" },
];

export const PROMO_FIELD_LABEL: Record<string, string> = Object.fromEntries(
  LISTING_PROMO_FIELDS.map((p) => [p.field, p.label])
);

export interface PromoEntry {
  key: string;
  label: string;
  /** null = علَم بلا تاريخ انتهاء. */
  untilMs: number | null;
}

/** مثل ms() في الخادم: Timestamp فقط (الأرقام لا تُعدّ ترويجاً فعّالاً). */
function promoMillis(v: unknown): number | null {
  return v && typeof v === "object" && typeof (v as { toMillis?: unknown }).toMillis === "function"
    ? toMillis(v)
    : null;
}

/** نفس شرط الخادم: حذف هذا المحتوى يتطلّب confirmPaid. */
export function isPaidContent(type: ContentType, d: DocumentData, nowMs: number = Date.now()): boolean {
  if (type === "listing") {
    const anyActive = LISTING_PROMO_FIELDS.some((p) => (promoMillis(d[p.field]) ?? 0) > nowMs);
    return anyActive || d.featured === true || d.type === "featured";
  }
  if (type === "story") return d.sponsored === true || d.pinned === true || d.storyKind === "sponsored";
  return d.isPinned === true || d.isSponsored === true;
}

/** الترويجات الفعّالة للعرض (مع الوقت المتبقي). */
export function activePromotions(type: ContentType, d: DocumentData, nowMs: number = Date.now()): PromoEntry[] {
  const out: PromoEntry[] = [];
  if (type === "listing") {
    for (const p of LISTING_PROMO_FIELDS) {
      const u = promoMillis(d[p.field]);
      if (u !== null && u > nowMs) out.push({ key: p.field, label: p.label, untilMs: u });
    }
    const has = (label: string) => out.some((e) => e.label === label);
    if ((d.featured === true || d.type === "featured") && !has("مميز")) out.push({ key: "featured", label: "مميز", untilMs: null });
    if (d.isPinned === true && !has("مثبّت")) out.push({ key: "isPinned", label: "مثبّت", untilMs: null });
    if (d.isSponsored === true && !has("ممول")) out.push({ key: "isSponsored", label: "ممول", untilMs: null });
    return out;
  }
  if (type === "story") {
    if (d.sponsored === true || d.storyKind === "sponsored") out.push({ key: "sponsored", label: "ممولة", untilMs: null });
    if (d.pinned === true) out.push({ key: "pinned", label: "مثبّتة", untilMs: null });
    return out;
  }
  if (d.isPinned === true) out.push({ key: "isPinned", label: "مثبّت", untilMs: null });
  if (d.isSponsored === true) out.push({ key: "isSponsored", label: "ممول", untilMs: null });
  return out;
}

// ------------------------------------------------------------------
// عنصر محتوى موحّد (للصفوف والمعاينة وصفحة صاحب المحتوى)
// ------------------------------------------------------------------

export interface ContentItem {
  type: ContentType;
  id: string;
  title: string;
  text: string;
  thumb: string;
  images: string[];
  videoUrl?: string;
  ownerId: string;
  ownerName: string;
  /** الحالة الخام (للإعلانات/المنشورات)؛ للقصص "story". */
  status: string;
  createdAtMs: number | null;
  expiresAtMs: number | null;
  hidden: boolean;
  price: number | null;
  budget: number | null;
  city: string;
  category: string;
  phone: string;
  moderation: ContentModeration | null;
  paid: boolean;
  promotions: PromoEntry[];
  rejectionReason: string;
  raw: DocumentData;
}

const STORY_TYPE_LABEL: Record<string, string> = { car: "سيارة", service: "خدمة", offer: "عرض" };

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clip(t: string, max: number): string {
  const c = t.replace(/\s+/g, " ").trim();
  return c.length > max ? `${c.slice(0, max - 1)}…` : c;
}

export function toContentItem(type: ContentType, id: string, d: DocumentData, nowMs: number = Date.now()): ContentItem {
  let title = "";
  let text = "";
  let images: string[] = [];
  let videoUrl: string | undefined;
  let thumb = "";
  let ownerName = "";
  let price: number | null = numOrNull(d.price);
  let budget: number | null = null;

  if (type === "listing") {
    title = s(d.title).trim() || "إعلان بلا عنوان";
    text = s(d.description);
    images = strList(d.images);
    // بعض الإعلانات القديمة تحفظ صورة واحدة في imageUrl بدل images.
    if (!images.length && s(d.imageUrl).trim()) images = [s(d.imageUrl).trim()];
    thumb = images[0] || "";
    ownerName = s(d.sellerName).trim() || s(d.displayName).trim();
  } else if (type === "post") {
    const t = s(d.title).trim();
    const body = s(d.text).trim();
    title = t || (body ? clip(body, 80) : "منشور");
    text = body;
    images = strList(d.images);
    videoUrl = s(d.videoUrl) || undefined;
    thumb = images[0] || "";
    ownerName = s(d.authorName).trim();
    budget = numOrNull(d.budget);
  } else {
    const media: Array<Record<string, unknown>> = Array.isArray(d.media)
      ? (d.media as unknown[]).filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      : [];
    images = media
      .filter((m) => m.kind !== "video" && typeof m.url === "string" && m.url)
      .map((m) => m.url as string);
    const vid = media.find((m) => m.kind === "video" && typeof m.url === "string" && m.url);
    videoUrl = (vid?.url as string | undefined) || (d.mediaType === "video" ? s(d.mediaUrl) : "") || undefined;
    const firstThumb = media.find((m) => typeof m.thumbnailUrl === "string" && m.thumbnailUrl)?.thumbnailUrl as
      | string
      | undefined;
    thumb = s(d.coverUrl) || firstThumb || images[0] || "";
    const p = (d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>;
    title =
      s(d.title).trim() ||
      s(p.title).trim() ||
      s(p.serviceName).trim() ||
      `قصة ${STORY_TYPE_LABEL[s(d.type)] ?? ""}`.trim();
    text = s(p.description).trim() || s(p.discount).trim() || s(d.caption).trim();
    ownerName = s(d.ownerName).trim();
    if (price === null) price = numOrNull(p.price);
  }

  const status = type === "story" ? "story" : s(d.status) || "pending";
  const payload = (d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>;

  return {
    type,
    id,
    title,
    text,
    thumb,
    images,
    videoUrl,
    ownerId: s(d[CONTENT_OWNER_FIELD[type]]),
    ownerName,
    status,
    // بعض الإعلانات تحفظ createdAt نصاً غير صالح ومعه createdTs (مللي).
    createdAtMs: toMillis(d.createdAt) ?? toMillis(d.createdTs) ?? toMillis(d.submittedAt),
    expiresAtMs: type === "story" ? toMillis(d.expiresAt) : null,
    hidden: d.hidden === true,
    price,
    budget,
    city: s(d.city) || s(payload.city),
    category: s(d.category),
    phone: s(d.phone) || s(payload.phone),
    moderation: parseModeration(d.moderation),
    paid: isPaidContent(type, d, nowMs),
    promotions: activePromotions(type, d, nowMs),
    rejectionReason: s(d.rejectionReason),
    raw: d,
  };
}

// ------------------------------------------------------------------
// الحالة المعروضة
// ------------------------------------------------------------------

export type DisplayStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "paused"
  | "paused_owner"
  | "removed"
  | "hidden"
  | "archived"
  | "draft"
  | "expired"
  | "other";

export function displayStatus(item: Pick<ContentItem, "type" | "status" | "moderation" | "hidden" | "expiresAtMs">, nowMs: number = Date.now()): DisplayStatus {
  const st = item.moderation?.state;
  if (st === "removed") return "removed";
  if (st === "paused") return "paused";
  if (item.type === "story") {
    if (item.hidden) return "hidden";
    if (item.expiresAtMs !== null && item.expiresAtMs <= nowMs) return "expired";
    return "approved";
  }
  switch (item.status) {
    case "active":
      // حالة منشورة يكتبها مسار آخر (10 إعلانات في الإنتاج 2026-11-21).
      return "approved";
    case "expired":
      return "expired";
    case "approved":
    case "pending":
    case "rejected":
    case "hidden":
    case "archived":
    case "draft":
      return item.status as DisplayStatus;
    case "removed":
      return "removed";
    case "paused":
      // منشور أوقفه صاحبه (بلا moderation.state) أو إيقاف قديم من شاشة المراجعة.
      return "paused_owner";
    default:
      return "other";
  }
}

const SLATE = "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

export const STATUS_META: Record<DisplayStatus, { label: string; cls: string }> = {
  approved: {
    label: "منشور",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-800",
  },
  pending: { label: "قيد المراجعة", cls: SLATE },
  rejected: {
    label: "مرفوض",
    cls: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-800",
  },
  paused: {
    label: "موقوف مؤقتاً",
    cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-800",
  },
  paused_owner: {
    label: "متوقف (ليس من الإدارة)",
    cls: "bg-amber-50/60 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-900",
  },
  removed: {
    label: "محذوف",
    cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-800",
  },
  hidden: { label: "مخفي", cls: SLATE },
  archived: { label: "مؤرشف", cls: SLATE },
  draft: { label: "مسودة", cls: SLATE },
  expired: { label: "منتهية", cls: SLATE },
  other: { label: "غير معروف", cls: SLATE },
};

export function statusLabel(type: ContentType, st: DisplayStatus): string {
  if (type === "story" && st === "approved") return "نشطة";
  return STATUS_META[st].label;
}

/** رابط المحتوى في الموقع العام (القصص بلا صفحة مستقلة). */
export function publicContentHref(type: ContentType, id: string): string | null {
  if (type === "listing") return `/listings/${id}`;
  if (type === "post") return `/friday-market/post/${id}`;
  return null;
}

/** رابط «إدارة المحتوى» في لوحة الأدمن (يفتح المعاينة مباشرة). */
export function contentAdminHref(type: ContentType, id?: string, reportId?: string | null): string {
  const q = new URLSearchParams({ type });
  if (id) q.set("id", id);
  if (reportId) q.set("report", reportId);
  return `/admin/content?${q.toString()}`;
}

/** رسالة للأزرار القديمة (اعتماد/رفض/إخفاء) حين ترفضها القواعد لمحتوى تحت الإدارة. */
export const MODERATED_LOCK_MESSAGE =
  "هذا المحتوى محذوف أو موقوف من «إدارة المحتوى»، ولا تتغيّر حالته إلا من هناك (استعادة/استئناف).";

/** خطأ صلاحيات من Firestore أو من الدالة. */
export function isPermissionDenied(e: unknown): boolean {
  const code = String((e as { code?: unknown } | null)?.code ?? "");
  return code === "permission-denied" || code.endsWith("/permission-denied");
}

/** نص قرار الإدارة لصاحب المحتوى (بلا اسم المشرف). */
export function ownerDecision(
  type: ContentType,
  mod: ContentModeration | null
): { tone: "rose" | "amber" | "emerald"; title: string; body: string } | null {
  if (!mod) return null;
  const noun = OWNER_NOUN[type];
  const why = [mod.reason, mod.note].filter(Boolean).join(" — ");
  if (mod.state === "removed") {
    return {
      tone: "rose",
      title: `حذفت الإدارة ${noun}`,
      body: `السبب: ${why || "مخالفة شروط الاستخدام"}. يمكنك مراسلة الدعم للاعتراض.`,
    };
  }
  if (mod.state === "paused") {
    return {
      tone: "amber",
      title: `أوقفت الإدارة ${noun} مؤقتاً`,
      body: `السبب: ${why || "مراجعة"}. لن يظهر للعموم حتى تستأنفه الإدارة.`,
    };
  }
  const resumed = mod.action === "resume" || mod.lastState === "paused";
  return {
    tone: "emerald",
    title: resumed ? `استأنفت الإدارة ${noun}` : `أعادت الإدارة ${noun}`,
    body: mod.note || (resumed ? "عاد المحتوى للظهور." : "تمت استعادة المحتوى بعد المراجعة."),
  };
}
