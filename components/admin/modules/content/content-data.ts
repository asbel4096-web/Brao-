import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CONTENT_COLLECTION,
  CONTENT_LOG_LABELS,
  LISTING_PROMO_FIELDS,
  displayStatus,
  toContentItem,
  toMillis,
  type ContentItem,
  type ContentType,
} from "@/lib/moderation/content";

/**
 * استعلامات «إدارة المحتوى». كلها تعتمد فهارس موجودة في الإنتاج فقط:
 *  - listings/posts: (status ASC, createdAt DESC) المركّب، أو createdAt وحده.
 *  - القصص/الترويج/البحث: مساواة أو مدى على حقل واحد، والترتيب في العميل.
 * لا استعلام هنا يحتاج فهرساً جديداً.
 */

export const PAGE_SIZE = 20;
const OWNER_LIMIT = 60;
const PROMO_LIMIT = 100;

export type StatusFilter = "all" | "approved" | "pending" | "rejected" | "paused" | "removed";

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "approved", label: "منشور" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "rejected", label: "مرفوض" },
  { key: "paused", label: "موقوف" },
  { key: "removed", label: "محذوف" },
];

export interface DateRange {
  fromMs: number | null;
  /** حصري (بداية اليوم التالي). */
  toMs: number | null;
}

export type Cursor = QueryDocumentSnapshot<DocumentData> | null;

export interface PageResult {
  items: ContentItem[];
  cursor: Cursor;
  hasMore: boolean;
  note?: string;
}

const inRange = (ms: number | null, r: DateRange) =>
  (r.fromMs === null || (ms !== null && ms >= r.fromMs)) && (r.toMs === null || (ms !== null && ms < r.toMs));

const byCreatedDesc = (a: ContentItem, b: ContentItem) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);

/** تطابق الحالة المعروضة مع مرشّح الحالة (للتصفية في العميل). */
export function matchesStatus(item: ContentItem, f: StatusFilter): boolean {
  if (f === "all") return true;
  const st = displayStatus(item);
  if (f === "paused") return st === "paused" || st === "paused_owner";
  return st === f;
}

export function applyClientFilters(items: ContentItem[], f: StatusFilter, r: DateRange): ContentItem[] {
  return items.filter((it) => matchesStatus(it, f) && inRange(it.createdAtMs, r));
}

/** صفحة من الإعلانات/المنشورات/القصص حسب الحالة والتاريخ. */
export async function fetchContentPage(
  type: ContentType,
  status: StatusFilter,
  range: DateRange,
  cursor: Cursor
): Promise<PageResult> {
  const col = collection(db, CONTENT_COLLECTION[type]);

  if (type !== "story") {
    const parts: QueryConstraint[] = [];
    // «منشور» يشمل approved وactive (كلاهما موجود في الإنتاج).
    if (status === "approved") parts.push(where("status", "in", ["approved", "active"]));
    else if (status !== "all") parts.push(where("status", "==", status));
    if (range.fromMs !== null) parts.push(where("createdAt", ">=", Timestamp.fromMillis(range.fromMs)));
    if (range.toMs !== null) parts.push(where("createdAt", "<", Timestamp.fromMillis(range.toMs)));
    parts.push(orderBy("createdAt", "desc"));
    if (cursor) parts.push(startAfter(cursor));
    parts.push(limit(PAGE_SIZE));
    const snap = await getDocs(query(col, ...parts));
    return {
      items: snap.docs.map((d) => toContentItem(type, d.id, d.data())),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  }

  // القصص: لا حقل status — «منشور» = نشطة غير مخفية، «محذوف» = moderation.state.
  if (status === "pending" || status === "rejected" || status === "paused") {
    return {
      items: [],
      cursor: null,
      hasMore: false,
      note: "هذه الحالة لا تنطبق على القصص (القصص لا تُراجع ولا تُوقف مؤقتاً — الحذف قابل للاستعادة).",
    };
  }
  const parts: QueryConstraint[] = [];
  let clientRange = false;
  if (status === "approved") {
    parts.push(where("expiresAt", ">", Timestamp.now()), orderBy("expiresAt", "desc"));
    clientRange = true;
  } else if (status === "removed") {
    parts.push(where("moderation.state", "==", "removed"));
    clientRange = true;
  } else {
    if (range.fromMs !== null) parts.push(where("createdAt", ">=", Timestamp.fromMillis(range.fromMs)));
    if (range.toMs !== null) parts.push(where("createdAt", "<", Timestamp.fromMillis(range.toMs)));
    parts.push(orderBy("createdAt", "desc"));
  }
  if (cursor) parts.push(startAfter(cursor));
  parts.push(limit(PAGE_SIZE));
  const snap = await getDocs(query(col, ...parts));
  let items = snap.docs.map((d) => toContentItem("story", d.id, d.data()));
  if (status === "approved") items = items.filter((it) => !it.hidden && !it.moderation?.state);
  if (clientRange) items = items.filter((it) => inRange(it.createdAtMs, range));
  if (status === "removed") items.sort(byCreatedDesc);
  return {
    items,
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

/**
 * «الإعلانات الترويجية»: إعلانات بترويج مدفوع فعّال. استعلامات بسيطة منفصلة (حقل واحد لكل منها)
 * تُدمج وتُزال تكراراتها وتُرتَّب في العميل.
 */
export async function fetchPromotedListings(): Promise<ContentItem[]> {
  const col = collection(db, "listings");
  const now = Timestamp.now();
  const queries = [
    ...LISTING_PROMO_FIELDS.map((p) => query(col, where(p.field, ">", now), limit(PROMO_LIMIT))),
    query(col, where("isPinned", "==", true), limit(PROMO_LIMIT)),
    query(col, where("isSponsored", "==", true), limit(PROMO_LIMIT)),
    query(col, where("featured", "==", true), limit(PROMO_LIMIT)),
  ];
  const results = await Promise.allSettled(queries.map((q) => getDocs(q)));
  const map = new Map<string, ContentItem>();
  let ok = 0;
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    ok++;
    for (const d of r.value.docs) {
      if (!map.has(d.id)) map.set(d.id, toContentItem("listing", d.id, d.data()));
    }
  }
  if (ok === 0) {
    const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw firstErr?.reason ?? new Error("promoted query failed");
  }
  return Array.from(map.values()).sort(byCreatedDesc);
}

export async function fetchContentItem(type: ContentType, id: string): Promise<ContentItem | null> {
  const snap = await getDoc(doc(db, CONTENT_COLLECTION[type], id));
  return snap.exists() ? toContentItem(type, snap.id, snap.data()) : null;
}

// ------------------------------------------------------------------
// صاحب المحتوى
// ------------------------------------------------------------------

export interface OwnerInfo {
  uid: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  photoURL: string;
  banned: boolean;
  disabled: boolean;
  /** "users" = الملف الكامل (أدمن)، "public" = النسخة العامة فقط. */
  source: "users" | "public";
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function fetchOwnerInfo(uid: string): Promise<OwnerInfo | null> {
  if (!uid || uid.includes("/")) return null;
  try {
    const u = await getDoc(doc(db, "users", uid));
    if (u.exists()) {
      const d = u.data();
      return {
        uid,
        name: str(d.name) || str(d.displayName) || str(d.businessName),
        username: str(d.username),
        phone: str(d.phone),
        email: str(d.email),
        photoURL: str(d.photoURL),
        banned: d.banned === true,
        disabled: d.disabled === true,
        source: "users",
      };
    }
  } catch {
    /* نكمل بالنسخة العامة */
  }
  try {
    const p = await getDoc(doc(db, "publicProfiles", uid));
    if (p.exists()) {
      const d = p.data();
      return {
        uid,
        name: str(d.name) || str(d.displayName),
        username: str(d.username),
        phone: "",
        email: "",
        photoURL: str(d.photoURL) || str(d.avatarUrl),
        banned: false,
        disabled: false,
        source: "public",
      };
    }
  } catch {
    /* لا شيء */
  }
  return null;
}

/** أسماء أصحاب المحتوى الناقصة من publicProfiles (أفضل-جهد، مع ذاكرة). */
const nameCache = new Map<string, string>();
export async function fillOwnerNames(items: ContentItem[]): Promise<ContentItem[]> {
  const missing = Array.from(new Set(items.filter((i) => !i.ownerName && i.ownerId).map((i) => i.ownerId)))
    .filter((uid) => !nameCache.has(uid) && !uid.includes("/"))
    .slice(0, 25);
  await Promise.all(
    missing.map(async (uid) => {
      try {
        const p = await getDoc(doc(db, "publicProfiles", uid));
        const d = p.exists() ? p.data() : null;
        nameCache.set(uid, d ? str(d.name) || str(d.displayName) || str(d.username) : "");
      } catch {
        nameCache.set(uid, "");
      }
    })
  );
  return items.map((i) => (!i.ownerName && nameCache.get(i.ownerId) ? { ...i, ownerName: nameCache.get(i.ownerId)! } : i));
}

// ------------------------------------------------------------------
// البحث
// ------------------------------------------------------------------

/** صيغ الرقم الليبي المحتملة كما قد تُخزَّن (‎+218 / 218 / 00218 / 0 / بلا بادئة). */
export function libyanPhoneVariants(input: string): string[] {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("218")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length < 7) return [];
  return Array.from(new Set([`0${d}`, `+218${d}`, `218${d}`, `00218${d}`, d]));
}

export function looksLikePhone(q: string): boolean {
  const t = q.trim();
  return /^[+\d\s()\-]+$/.test(t) && t.replace(/\D/g, "").length >= 7;
}

export interface SearchOwner {
  uid: string;
  name: string;
  via: string;
}

export interface SearchResult {
  items: ContentItem[];
  owners: SearchOwner[];
}

export async function fetchOwnerItems(uid: string): Promise<ContentItem[]> {
  const [l, p, s] = await Promise.allSettled([
    getDocs(query(collection(db, "listings"), where("ownerId", "==", uid), limit(OWNER_LIMIT))),
    getDocs(query(collection(db, "posts"), where("authorId", "==", uid), limit(OWNER_LIMIT))),
    getDocs(query(collection(db, "stories"), where("ownerId", "==", uid), limit(OWNER_LIMIT))),
  ]);
  const out: ContentItem[] = [];
  if (l.status === "fulfilled") l.value.docs.forEach((d) => out.push(toContentItem("listing", d.id, d.data())));
  if (p.status === "fulfilled") p.value.docs.forEach((d) => out.push(toContentItem("post", d.id, d.data())));
  if (s.status === "fulfilled") s.value.docs.forEach((d) => out.push(toContentItem("story", d.id, d.data())));
  return out;
}

/**
 * بحث موحّد: معرّف محتوى (قراءة مباشرة)، اسم مستخدم (usernames/{name} → uid)، رقم هاتف
 * (صيغ ليبية على users و listings)، أو UID صاحب الحساب — ثم كل محتوى صاحب الحساب.
 */
export async function searchContent(raw: string): Promise<SearchResult> {
  const q = raw.trim();
  const owners = new Map<string, SearchOwner>();
  const items = new Map<string, ContentItem>();
  const add = (it: ContentItem) => items.set(`${it.type}:${it.id}`, it);
  const addOwner = (uid: string, name: string, via: string) => {
    if (uid && !uid.includes("/") && !owners.has(uid)) owners.set(uid, { uid, name, via });
  };

  if (!q) return { items: [], owners: [] };

  if (looksLikePhone(q)) {
    const variants = libyanPhoneVariants(q);
    if (variants.length) {
      const [u, l] = await Promise.allSettled([
        getDocs(query(collection(db, "users"), where("phone", "in", variants), limit(10))),
        getDocs(query(collection(db, "listings"), where("phone", "in", variants), limit(OWNER_LIMIT))),
      ]);
      if (u.status === "fulfilled") {
        u.value.docs.forEach((d) => addOwner(d.id, str(d.data().name), "رقم الهاتف"));
      }
      if (l.status === "fulfilled") {
        l.value.docs.forEach((d) => {
          const it = toContentItem("listing", d.id, d.data());
          add(it);
          addOwner(it.ownerId, it.ownerName, "هاتف الإعلان");
        });
      }
      if (u.status === "rejected" && l.status === "rejected") throw u.reason;
    }
  } else if (!q.includes("/") && q.length <= 128 && q !== "." && q !== ".." && !/^__.*__$/.test(q)) {
    const uname = q.replace(/^@/, "").toLowerCase();
    const [li, po, st, us, un] = await Promise.allSettled([
      getDoc(doc(db, "listings", q)),
      getDoc(doc(db, "posts", q)),
      getDoc(doc(db, "stories", q)),
      getDoc(doc(db, "users", q)),
      uname && !uname.includes("/") && uname !== "." && uname !== ".." && !/^__.*__$/.test(uname)
        ? getDoc(doc(db, "usernames", uname))
        : Promise.resolve(null),
    ]);
    if (li.status === "fulfilled" && li.value.exists()) add(toContentItem("listing", li.value.id, li.value.data()));
    if (po.status === "fulfilled" && po.value.exists()) add(toContentItem("post", po.value.id, po.value.data()));
    if (st.status === "fulfilled" && st.value.exists()) add(toContentItem("story", st.value.id, st.value.data()));
    if (us.status === "fulfilled" && us.value.exists()) {
      const d = us.value.data();
      addOwner(us.value.id, str(d.name) || str(d.displayName), "UID");
    }
    if (un.status === "fulfilled" && un.value && un.value.exists()) {
      const uid = str(un.value.data()?.uid);
      if (uid) addOwner(uid, "", `اسم المستخدم @${uname}`);
    }
  }

  const ownerList = Array.from(owners.values()).slice(0, 5);
  const perOwner = await Promise.all(ownerList.map((o) => fetchOwnerItems(o.uid)));
  perOwner.flat().forEach(add);

  // اسم صاحب الحساب من محتواه إن لم يُعرف.
  for (const o of ownerList) {
    if (!o.name) o.name = perOwner.flat().find((i) => i.ownerId === o.uid && i.ownerName)?.ownerName ?? "";
  }

  return { items: Array.from(items.values()).sort(byCreatedDesc), owners: ownerList };
}

// ------------------------------------------------------------------
// السجل (adminLogs)
// ------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  action: string;
  label: string;
  adminName: string;
  adminRole: string;
  reason: string;
  note: string;
  notified: boolean;
  paid: boolean;
  reportId: string;
  atMs: number | null;
}

export async function fetchHistory(type: ContentType, id: string): Promise<HistoryEntry[]> {
  const snap = await getDocs(query(collection(db, "adminLogs"), where("targetId", "==", id), limit(50)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      const action = str(x.action);
      return {
        id: d.id,
        targetType: str(x.targetType),
        action,
        label: CONTENT_LOG_LABELS[action] ?? action.replace(/_/g, " "),
        adminName: str(x.adminName),
        adminRole: str(x.adminRole),
        reason: str(x.reason),
        note: str(x.note),
        notified: x.notified === true,
        paid: x.paid === true,
        reportId: str(x.reportId),
        atMs: toMillis(x.createdAt),
      };
    })
    .filter((e) => !e.targetType || e.targetType === type)
    .map(({ targetType: _t, ...rest }) => rest)
    .sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));
}
