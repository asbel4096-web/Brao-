/**
 * منشورات المجتمع (سابقاً «سوق الجمعة») — مطابقة لتطبيق Flutter حرفياً
 * (lib/features/friday_market في التطبيق: friday_post.dart + friday_posts_repository.dart).
 *
 * - المجموعة: `posts`. الـFeed = المعتمدة فقط (status == 'approved') الأحدث أولاً، 15 لكل صفحة
 *   (فهرس الإنتاج: status ASC, createdAt DESC).
 * - الإنشاء: status 'pending' دائماً (تفرضه القاعدة) ثم يعتمده الأدمن.
 * - الصور: Storage `listing-images/{uid}/{uuid}.jpg` (نفس مسار التطبيق).
 * - الإعجاب: posts/{id}/likes/{uid} + likesCount ±1 في معاملة. التعليقات: posts/{id}/comments.
 * - المراجعة: setStatus بدمج {status, rejectionReason?, reviewedAt, updatedAt}.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { compressImage } from "@/lib/dealer/storage";
import { parseModeration, type ContentModeration } from "@/lib/moderation/content";

export const POSTS = "posts";
export const MAX_IMAGES = 10;
export const MAX_TEXT = 3000;
export const MAX_COMMENT = 1000;
export const FEED_PAGE = 15;
export const COMMENTS_PAGE = 20;

export type PostStatus = "pending" | "approved" | "rejected" | "hidden" | "paused";

export type PostType =
  | "for_sale"
  | "wanted"
  | "service"
  | "part"
  | "offer"
  | "question"
  | "exchange"
  | "image"
  | "video"
  | "general";

export const POST_TYPES: { type: PostType; label: string }[] = [
  { type: "for_sale", label: "للبيع" },
  { type: "wanted", label: "مطلوب" },
  { type: "service", label: "خدمة" },
  { type: "part", label: "قطعة غيار" },
  { type: "offer", label: "عرض خاص" },
  { type: "question", label: "سؤال" },
  { type: "exchange", label: "تبادل" },
  { type: "image", label: "صورة" },
  { type: "video", label: "فيديو" },
  { type: "general", label: "إعلان عام" },
];

export function toPostType(v: unknown): PostType {
  const s = String(v ?? "");
  return (POST_TYPES.find((t) => t.type === s)?.type ?? "general") as PostType;
}
export const typeLabel = (t: PostType) =>
  POST_TYPES.find((x) => x.type === t)?.label ?? "إعلان عام";

// دلالات النوع — نفس FridayPostType في التطبيق.
export const showsPrice = (t: PostType) => t === "for_sale" || t === "offer";
export const showsBudget = (t: PostType) => t === "wanted";
export const showsCondition = (t: PostType) => t === "for_sale" || t === "part";
export const showsTitle = (t: PostType) =>
  ["for_sale", "wanted", "service", "part", "offer", "exchange"].includes(t);
export const showsCategory = (t: PostType) =>
  !["question", "general", "image", "video"].includes(t);
export function titleHint(t: PostType): string {
  switch (t) {
    case "wanted":
      return "ماذا تطلب؟ (مثال: كامري 2018)";
    case "service":
      return "اسم الخدمة أو الورشة";
    case "part":
      return "اسم القطعة";
    case "exchange":
      return "ماذا تعرض؟";
    default:
      return "العنوان";
  }
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  authorVerified: boolean;
  type: PostType;
  title: string;
  text: string;
  images: string[];
  videoUrl?: string;
  price?: number;
  budget?: number;
  category: string;
  city: string;
  condition: string;
  phone?: string;
  whatsapp?: string;
  status: PostStatus | string;
  likesCount: number;
  commentsCount: number;
  views: number;
  createdAt?: Timestamp | null;
  submittedAt?: Timestamp | null;
  rejectionReason?: string;
  /** ترويج المنشور (يُمنح خادمياً) — يجعل حذفه «محتوى مدفوعاً» في إدارة المحتوى. */
  isPinned?: boolean;
  isSponsored?: boolean;
  /** قرار «إدارة المحتوى» (moderateContent): state = removed/paused، أو null بعد الاستعادة. */
  moderation?: ContentModeration | null;
}

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const numOrUndef = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : undefined);
const strOrUndef = (v: unknown) => {
  const s = str(v).trim();
  return s ? s : undefined;
};

/** قراءة دفاعية (نفس FridayPost.fromDoc). */
export function postFromData(id: string, d: DocumentData): CommunityPost {
  return {
    id,
    authorId: str(d.authorId),
    authorName: str(d.authorName),
    authorPhotoUrl: str(d.authorPhotoUrl),
    authorVerified: d.authorVerified === true,
    type: toPostType(d.type),
    title: str(d.title),
    text: str(d.text),
    images: Array.isArray(d.images) ? d.images.map((x: unknown) => String(x)) : [],
    videoUrl: strOrUndef(d.videoUrl),
    price: numOrUndef(d.price),
    budget: numOrUndef(d.budget),
    category: str(d.category),
    city: str(d.city),
    condition: str(d.condition),
    phone: strOrUndef(d.phone),
    whatsapp: strOrUndef(d.whatsapp),
    status: str(d.status) || "pending",
    likesCount: num(d.likesCount),
    commentsCount: num(d.commentsCount),
    views: num(d.views),
    createdAt: (d.createdAt as Timestamp) ?? null,
    submittedAt: (d.submittedAt as Timestamp) ?? null,
    rejectionReason: strOrUndef(d.rejectionReason),
    isPinned: d.isPinned === true,
    isSponsored: d.isSponsored === true,
    moderation: parseModeration(d.moderation),
  };
}

// ------------------------------ Feed ------------------------------

export async function fetchApprovedPage(
  after?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FEED_PAGE
): Promise<{ posts: CommunityPost[]; last: QueryDocumentSnapshot<DocumentData> | null }> {
  const parts = [
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
    ...(after ? [startAfter(after)] : []),
    qLimit(pageSize),
  ];
  const snap = await getDocs(query(collection(db, POSTS), ...parts));
  return {
    posts: snap.docs.map((d) => postFromData(d.id, d.data())),
    last: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

export function watchPost(
  id: string,
  onData: (p: CommunityPost | null) => void,
  onError: (e: unknown) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, POSTS, id),
    (s) => onData(s.exists() ? postFromData(s.id, s.data()) : null),
    onError
  );
}

// ------------------------------ إنشاء ------------------------------

const extOf = (type: string) =>
  type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

/** رفع صور المنشور (ضغط JPEG حتى 1600px) إلى listing-images/{uid}/{uuid}.jpg. */
export async function uploadPostImages(
  uid: string,
  files: File[],
  onEach?: (index: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const prepared = await compressImage(files[i], 1600, 0.85);
      const type = prepared.type || "image/jpeg";
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      const r = ref(storage, `listing-images/${uid}/${id}.${extOf(type)}`);
      await uploadBytes(r, prepared, { contentType: type });
      urls.push(await getDownloadURL(r));
      onEach?.(i);
    }
    return urls;
  } catch (e) {
    await deleteUploaded(urls);
    throw e;
  }
}

/** حذف صور يتيمة إن فشل حفظ المنشور (أفضل-جهد). */
export async function deleteUploaded(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map((u) => deleteObject(ref(storage, u)).catch(() => undefined))
  );
}

export interface NewPostInput {
  uid: string;
  type: PostType;
  text: string;
  title?: string;
  images?: string[];
  price?: number | null;
  budget?: number | null;
  category?: string;
  city?: string;
  condition?: string;
  phone?: string | null;
  authorName?: string;
  authorPhotoUrl?: string;
}

/** نفس شكل FridayPostsRepository.create في التطبيق. */
export async function createPost(input: NewPostInput): Promise<string> {
  const t = input.type;
  const phone = (input.phone ?? "").trim();
  const payload: Record<string, unknown> = {
    authorId: input.uid,
    authorName: input.authorName ?? "",
    authorPhotoUrl: input.authorPhotoUrl ?? "",
    authorVerified: false,
    type: t,
    title: showsTitle(t) ? (input.title ?? "").trim() : "",
    text: input.text.trim(),
    images: input.images ?? [],
    category: showsCategory(t) ? (input.category ?? "").trim() : "",
    city: (input.city ?? "").trim(),
    condition: showsCondition(t) ? (input.condition ?? "").trim() : "",
    status: "pending",
    likesCount: 0,
    commentsCount: 0,
    views: 0,
    isPinned: false,
    isSponsored: false,
    attributes: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  };
  if (showsPrice(t) && input.price != null) payload.price = input.price;
  if (showsBudget(t) && input.budget != null) payload.budget = input.budget;
  if (showsCategory(t) && phone) {
    payload.phone = phone;
    payload.whatsapp = phone;
  }
  const r = await addDoc(collection(db, POSTS), payload);
  return r.id;
}

// --------------------------- تفاعل ---------------------------

/** +1 مشاهدة (أفضل-جهد؛ القاعدة تسمح للمسجّل بزيادة views بمقدار 1 فقط). */
export async function bumpViews(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, POSTS, id), { views: increment(1) });
  } catch {
    /* تجاهل */
  }
}

export function watchLiked(
  postId: string,
  uid: string,
  onData: (liked: boolean) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, POSTS, postId, "likes", uid),
    (s) => onData(s.exists()),
    () => onData(false)
  );
}

export async function toggleLike(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, POSTS, postId);
  const likeRef = doc(db, POSTS, postId, "likes", uid);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(likeRef);
    if (s.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likesCount: increment(-1) });
    } else {
      tx.set(likeRef, { userId: uid, createdAt: serverTimestamp() });
      tx.update(postRef, { likesCount: increment(1) });
    }
  });
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  text: string;
  createdAt?: Timestamp | null;
}

export async function fetchCommentsPage(
  postId: string,
  after?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = COMMENTS_PAGE
): Promise<{ comments: PostComment[]; last: QueryDocumentSnapshot<DocumentData> | null }> {
  const parts = [
    orderBy("createdAt", "desc"),
    ...(after ? [startAfter(after)] : []),
    qLimit(pageSize),
  ];
  const snap = await getDocs(query(collection(db, POSTS, postId, "comments"), ...parts));
  return {
    comments: snap.docs
      .filter((d) => d.data().isHidden !== true)
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          userId: str(x.userId),
          userName: str(x.userName),
          userPhotoURL: str(x.userPhotoURL),
          text: str(x.text),
          createdAt: (x.createdAt as Timestamp) ?? null,
        };
      }),
    last: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** نفس شكل التعليق في التطبيق (القاعدة تقبل هذه المفاتيح فقط، والنص 1..1000). */
export async function addComment(args: {
  postId: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  text: string;
}): Promise<string> {
  const r = await addDoc(collection(db, POSTS, args.postId, "comments"), {
    userId: args.userId,
    userName: args.userName,
    userPhotoURL: args.userPhotoURL,
    text: args.text.trim(),
    createdAt: serverTimestamp(),
    reactions: {},
    reported: false,
    reportedCount: 0,
  });
  try {
    await updateDoc(doc(db, POSTS, args.postId), { commentsCount: increment(1) });
  } catch {
    /* تجاهل */
  }
  return r.id;
}

// ------------------------------ الأدمن ------------------------------

export const REVIEW_TABS: { status: PostStatus; label: string }[] = [
  { status: "pending", label: "قيد المراجعة" },
  { status: "approved", label: "معتمد" },
  { status: "rejected", label: "مرفوض" },
  { status: "hidden", label: "مخفي" },
  { status: "paused", label: "متوقف" },
];

export type ReviewTone = "green" | "red" | "navy" | "amber" | "blue";
export interface ReviewAction {
  label: string;
  target: PostStatus;
  tone: ReviewTone;
  reason?: boolean;
  filled?: boolean;
}

/** نفس _actionsFor في لوحة مراجعة التطبيق. */
export function reviewActionsFor(status: string): ReviewAction[] {
  switch (status) {
    case "pending":
      return [
        { label: "اعتماد", target: "approved", tone: "green", filled: true },
        { label: "رفض", target: "rejected", tone: "red", reason: true },
        { label: "إخفاء", target: "hidden", tone: "navy" },
      ];
    case "approved":
      return [
        { label: "إيقاف", target: "paused", tone: "amber" },
        { label: "إخفاء", target: "hidden", tone: "navy" },
        { label: "إعادة للمراجعة", target: "pending", tone: "blue" },
      ];
    case "rejected":
      return [
        { label: "إعادة للمراجعة", target: "pending", tone: "blue" },
        { label: "إخفاء", target: "hidden", tone: "navy" },
      ];
    case "hidden":
      return [
        { label: "إعادة للمراجعة", target: "pending", tone: "blue" },
        { label: "اعتماد", target: "approved", tone: "green", filled: true },
      ];
    case "paused":
      return [
        { label: "إعادة للمراجعة", target: "pending", tone: "blue" },
        { label: "إخفاء", target: "hidden", tone: "navy" },
      ];
    default:
      return [];
  }
}

/** منشورات بحالة معيّنة — مرتّبة في العميل (بلا فهرس مركّب)، حتى [max]. */
export function watchByStatus(
  status: PostStatus,
  onData: (posts: CommunityPost[]) => void,
  onError: (e: unknown) => void,
  max = 100
): Unsubscribe {
  return onSnapshot(
    query(collection(db, POSTS), where("status", "==", status), qLimit(max)),
    (s) => {
      const ms = (p: CommunityPost) =>
        (p.submittedAt ?? p.createdAt)?.toMillis?.() ?? 0;
      onData(
        s.docs
          .map((d) => postFromData(d.id, d.data()))
          .sort((a, b) => ms(b) - ms(a))
      );
    },
    onError
  );
}

/** تغيير الحالة (اعتماد/رفض/إخفاء/إيقاف/إعادة) — نفس setStatus في التطبيق. */
export async function setPostStatus(
  id: string,
  status: PostStatus,
  reason?: string
): Promise<void> {
  const why = (reason ?? "").trim();
  await setDoc(
    doc(db, POSTS, id),
    {
      status,
      ...(why ? { rejectionReason: why } : {}),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ------------------------------ أدوات عرض ------------------------------

/** رابط واتساب لرقم ليبي (09… → 2189…). */
export function waLink(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("218") ? d : d.startsWith("0") ? "218" + d.slice(1) : "218" + d;
  return `https://wa.me/${intl}`;
}
