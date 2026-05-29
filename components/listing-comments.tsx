"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment,
  deleteField,
} from "firebase/firestore";
import { MessageCircle, MoreHorizontal, Send, SmilePlus } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createNotification } from "@/lib/notifications";
import type { ListingComment } from "@/lib/types";
import {
  COMMENT_REACTIONS,
  getReactionMeta,
  summarizeReactions,
  type CommentReactionKey,
} from "@/lib/comment-reactions";
import { CommentReactionBar } from "@/components/comment-reaction-bar";
import {
  CommentContextMenu,
  type CommentMenuAction,
} from "@/components/comment-context-menu";
import { ReportDialog } from "@/components/report/report-dialog";

type Props = {
  listingId: string;
  ownerId: string;
  commentsEnabled?: boolean;
};

/**
 * طول الضغط لاعتباره long-press على الموبايل. أقل من هذا يُعالَج كنقرة عادية.
 * نختار 380ms — أطول من tap عادي، أقصر من ما يفتح iOS context menu النظامي
 * (~500ms) فيه احتمال interception. مع preventDefault على touchmove نحجز
 * الـgesture لنا.
 */
const LONG_PRESS_MS = 380;
/** نسمح بحركة بسيطة بالإصبع قبل إلغاء الـlong-press (scroll vs hold). */
const LONG_PRESS_MOVE_TOLERANCE = 8;

interface UIState {
  /** أي قائمة مفتوحة الآن، وعلى أي تعليق. */
  open: { kind: "reactions" | "menu"; commentId: string; rect: DOMRect } | null;
  /** التعليق الذي نُجيب عليه حالياً (يظهر اقتباس فوق textarea). */
  replyTo: ListingComment | null;
}

export default function ListingComments({
  listingId,
  ownerId,
  commentsEnabled = true,
}: Props) {
  const { user, profile, isAdmin } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState<ListingComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ui, setUi] = useState<UIState>({ open: null, replyTo: null });
  // التعليق الذي يفتح له dialog الإبلاغ. null = الـdialog مغلق.
  const [reportComment, setReportComment] = useState<ListingComment | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // refs لكل عنصر تعليق - نحتاج DOMRect عند فتح الـbar/menu.
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ----------------------------------------------------------------
  // التمرير لقسم التعليقات عند #comments
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#comments") return;
    const t = setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (user && commentsEnabled) {
        textareaRef.current?.focus({ preventScroll: true });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [user, commentsEnabled]);

  // ----------------------------------------------------------------
  // اشتراك مباشر بالتعليقات
  // ----------------------------------------------------------------
  useEffect(() => {
    const q = query(
      collection(db, "listings", listingId, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as Omit<ListingComment, "id">;
          return { ...data, id: d.id } as ListingComment;
        });
        setComments(next);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [listingId]);

  const canPost = useMemo(
    () => Boolean(user && text.trim().length >= 2 && commentsEnabled && !sending),
    [user, text, commentsEnabled, sending]
  );

  // ----------------------------------------------------------------
  // إضافة تعليق / رد
  // ----------------------------------------------------------------
  const handleSubmit = async () => {
    const value = text.trim();
    if (!user) {
      toast.warning("سجّل الدخول أولًا لإضافة تعليق.");
      return;
    }
    if (!commentsEnabled) {
      toast.warning("التعليقات مغلقة لهذا الإعلان.");
      return;
    }
    if (value.length < 2) {
      toast.warning("اكتب تعليقًا واضحًا.");
      return;
    }

    try {
      setSending(true);

      const replyParent = ui.replyTo;
      const payload: Record<string, unknown> = {
        userId: user.uid,
        userName:
          profile?.businessName ||
          profile?.name ||
          user.displayName ||
          user.email ||
          "مستخدم",
        userPhotoURL: profile?.photoURL || user.photoURL || "",
        text: value,
        createdAt: serverTimestamp(),
        reported: false,
        reportedCount: 0,
      };
      if (replyParent) payload.parentId = replyParent.id;

      await addDoc(collection(db, "listings", listingId, "comments"), payload);

      await updateDoc(doc(db, "listings", listingId), {
        commentsCount: increment(1),
      });

      // إشعار لصاحب الإعلان / صاحب التعليق الأصل عند الرد.
      // أولوية: إن كان رداً → إشعار للأصل. غير ذلك → إشعار لصاحب الإعلان.
      const actorName =
        profile?.businessName ||
        profile?.name ||
        user.displayName ||
        "مستخدم";

      if (replyParent && replyParent.userId !== user.uid) {
        await createNotification({
          userId: replyParent.userId,
          type: "new_comment",
          title: "رد جديد على تعليقك",
          body: `ردّ ${actorName} على تعليقك.`,
          link: `/listings/${listingId}#comments`,
          meta: {
            actorId: user.uid,
            actorName,
            actorPhoto: profile?.photoURL || user.photoURL || "",
            listingId,
          },
        });
      } else if (ownerId && ownerId !== user.uid) {
        await createNotification({
          userId: ownerId,
          type: "new_comment",
          title: "تعليق جديد",
          body: `علّق ${actorName} على إعلانك.`,
          link: `/listings/${listingId}#comments`,
          meta: {
            actorId: user.uid,
            actorName,
            actorPhoto: profile?.photoURL || user.photoURL || "",
            listingId,
          },
        });
      }

      setText("");
      setUi((s) => ({ ...s, replyTo: null }));
      toast.success(replyParent ? "تم إرسال الرد." : "تمت إضافة التعليق.");
    } catch (error: any) {
      toast.error(error?.message || "تعذّر إضافة التعليق.");
    } finally {
      setSending(false);
    }
  };

  // ----------------------------------------------------------------
  // تفاعل (يستخدم نفس endpoint لإضافة/تغيير/إزالة)
  // ----------------------------------------------------------------
  const handleReact = async (
    comment: ListingComment,
    key: CommentReactionKey
  ) => {
    if (!user) {
      toast.warning("سجّل الدخول للتفاعل.");
      return;
    }
    try {
      const current = comment.reactions?.[user.uid];
      const ref = doc(db, "listings", listingId, "comments", comment.id);

      // إذا كان نفس التفاعل → إزالة (toggle off). غير ذلك → ضبط.
      if (current === key) {
        await updateDoc(ref, {
          [`reactions.${user.uid}`]: deleteField(),
        });
      } else {
        await updateDoc(ref, {
          [`reactions.${user.uid}`]: key,
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "تعذّر حفظ التفاعل.");
    } finally {
      setUi((s) => ({ ...s, open: null }));
    }
  };

  // ----------------------------------------------------------------
  // حذف
  // ----------------------------------------------------------------
  const handleDelete = async (comment: ListingComment) => {
    if (!user) return;
    const isOwner = comment.userId === user.uid;
    const isListingOwner = ownerId === user.uid;
    if (!isOwner && !isAdmin && !isListingOwner) {
      toast.warning("ليس لديك صلاحية حذف هذا التعليق.");
      return;
    }
    if (typeof window !== "undefined") {
      const ok = window.confirm("هل تريد فعلاً حذف هذا التعليق؟");
      if (!ok) return;
    }
    try {
      setBusyId(comment.id);
      await deleteDoc(doc(db, "listings", listingId, "comments", comment.id));
      await updateDoc(doc(db, "listings", listingId), {
        commentsCount: increment(-1),
      });
      toast.success("تم حذف التعليق.");
    } catch (error: any) {
      toast.error(error?.message || "تعذّر حذف التعليق.");
    } finally {
      setBusyId(null);
    }
  };

  // ----------------------------------------------------------------
  // بلاغ — يفتح ReportDialog من نظام الإشراف الجديد.
  // البلاغ يُكتب في collection /reports ويظهر للأدمن في
  // /admin/moderation/reports. هذا أفضل من الـflag القديم على التعليق
  // لأنه يحفظ السبب والتفاصيل ويُمكن من اتخاذ إجراء محدّد.
  // ----------------------------------------------------------------
  const handleReport = (comment: ListingComment) => {
    if (!user) {
      toast.warning("سجّل الدخول للتبليغ.");
      return;
    }
    if (comment.userId === user.uid) {
      toast.warning("لا يمكنك التبليغ عن تعليقك.");
      return;
    }
    setReportComment(comment);
  };

  // ----------------------------------------------------------------
  // نسخ نص التعليق
  // ----------------------------------------------------------------
  const handleCopy = async (comment: ListingComment) => {
    try {
      await navigator.clipboard.writeText(comment.text);
      toast.success("تم نسخ نص التعليق.");
    } catch {
      toast.error("تعذّر النسخ.");
    }
  };

  // ----------------------------------------------------------------
  // مشاركة - رابط مباشر للتعليق
  // ----------------------------------------------------------------
  const handleShare = async (comment: ListingComment) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/listings/${listingId}#comment-${comment.id}`
        : `/listings/${listingId}#comment-${comment.id}`;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({
          title: "تعليق على إعلان",
          text: comment.text,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط التعليق.");
    } catch {
      /* المستخدم ألغى - تجاهل */
    }
  };

  // ----------------------------------------------------------------
  // رد (يُفعّل replyTo ويُركّز الـtextarea)
  // ----------------------------------------------------------------
  const handleReplyAction = (comment: ListingComment) => {
    setUi((s) => ({ ...s, replyTo: comment, open: null }));
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current?.focus({ preventScroll: true });
    }, 100);
  };

  const handleMenuAction = (comment: ListingComment, action: CommentMenuAction) => {
    setUi((s) => ({ ...s, open: null }));
    switch (action) {
      case "reply":
        handleReplyAction(comment);
        break;
      case "delete":
        void handleDelete(comment);
        break;
      case "share":
        void handleShare(comment);
        break;
      case "copy":
        void handleCopy(comment);
        break;
      case "report":
        void handleReport(comment);
        break;
    }
  };

  // ----------------------------------------------------------------
  // long-press helper
  // ----------------------------------------------------------------
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressFired = useRef(false);

  const beginLongPress = (
    commentId: string,
    x: number,
    y: number
  ) => {
    longPressStart.current = { x, y };
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      const el = commentRefs.current[commentId];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setUi((s) => ({ ...s, open: { kind: "menu", commentId, rect } }));
      // اهتزاز خفيف على الموبايل لو متاح
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as any).vibrate?.(15); } catch { /* ignore */ }
      }
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const moveLongPress = (x: number, y: number) => {
    const s = longPressStart.current;
    if (!s) return;
    const dx = Math.abs(x - s.x);
    const dy = Math.abs(y - s.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
      cancelLongPress();
    }
  };

  // فتح الـbar/menu برمجياً من زر:
  const openFor = (
    commentId: string,
    kind: "reactions" | "menu",
    targetEl: HTMLElement
  ) => {
    const rect = targetEl.getBoundingClientRect();
    setUi((s) => ({ ...s, open: { kind, commentId, rect } }));
  };

  // ----------------------------------------------------------------
  // التعليقات الجذرية والردود (مُسطّحة)
  // ----------------------------------------------------------------
  const { roots, repliesByParent } = useMemo(() => {
    const rootsArr: ListingComment[] = [];
    const repliesMap: Record<string, ListingComment[]> = {};
    for (const c of comments) {
      if (c.parentId) {
        (repliesMap[c.parentId] = repliesMap[c.parentId] || []).push(c);
      } else {
        rootsArr.push(c);
      }
    }
    // الردود تُعرَض بترتيب زمني صاعد (الأقدم أولاً) - أسهل في القراءة
    for (const k of Object.keys(repliesMap)) {
      repliesMap[k].sort((a, b) => {
        const ta = (a.createdAt as any)?.toMillis?.() || 0;
        const tb = (b.createdAt as any)?.toMillis?.() || 0;
        return ta - tb;
      });
    }
    return { roots: rootsArr, repliesByParent: repliesMap };
  }, [comments]);

  // ----------------------------------------------------------------
  // عرض تعليق واحد
  // ----------------------------------------------------------------
  const renderComment = (comment: ListingComment, isReply = false) => {
    const isOwner = user?.uid === comment.userId;
    const isListingOwner = user?.uid === ownerId;
    const canDelete = Boolean(isOwner || isAdmin || isListingOwner);
    const isBusy = busyId === comment.id;
    const myReaction = (user ? comment.reactions?.[user.uid] : null) as
      | CommentReactionKey
      | null
      | undefined;
    const summary = summarizeReactions(comment.reactions);
    const replies = repliesByParent[comment.id] || [];

    return (
      <div key={comment.id} className={isReply ? "ms-10" : ""}>
        <div
          id={`comment-${comment.id}`}
          ref={(el) => {
            commentRefs.current[comment.id] = el;
          }}
          className={`
            relative rounded-3xl border bg-white p-4
            dark:bg-slate-950/40
            ${isBusy ? "opacity-60" : ""}
            ${isReply
              ? "border-slate-100 dark:border-slate-800/70"
              : "border-slate-200 dark:border-slate-800"}
          `}
          // long-press على المحتوى الرئيسي للتعليق
          onTouchStart={(e) => {
            const t = e.touches[0];
            beginLongPress(comment.id, t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            moveLongPress(t.clientX, t.clientY);
          }}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onPointerDown={(e) => {
            // ندعم mouse/pen كذلك
            if (e.pointerType === "mouse" || e.pointerType === "pen") {
              beginLongPress(comment.id, e.clientX, e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType === "mouse" || e.pointerType === "pen") {
              moveLongPress(e.clientX, e.clientY);
            }
          }}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onContextMenu={(e) => {
            // منع context menu النظامي على الديسكتوب وفتح قائمتنا بدلاً
            e.preventDefault();
            const el = commentRefs.current[comment.id];
            if (el) {
              setUi((s) => ({
                ...s,
                open: { kind: "menu", commentId: comment.id, rect: el.getBoundingClientRect() },
              }));
            }
          }}
        >
          <div className="flex items-start gap-3">
            {comment.userPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comment.userPhotoURL}
                alt={comment.userName}
                className={`flex-none rounded-full object-cover ${isReply ? "h-8 w-8" : "h-10 w-10"}`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`
                  grid flex-none place-items-center rounded-full
                  bg-brand-700 font-black text-white
                  ${isReply ? "h-8 w-8 text-sm" : "h-10 w-10"}
                `}
              >
                {(comment.userName || "م").charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold text-slate-900 dark:text-white">
                  {comment.userName}
                </span>
                <button
                  type="button"
                  aria-label="خيارات التعليق"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFor(comment.id, "menu", e.currentTarget);
                  }}
                  className="
                    -m-1 grid h-8 w-8 flex-none place-items-center rounded-full
                    text-slate-400 transition
                    hover:bg-slate-100 hover:text-slate-700
                    dark:hover:bg-slate-800 dark:hover:text-slate-200
                  "
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <p className="mt-1 break-words text-[15px] leading-7 text-slate-700 dark:text-slate-200">
                {comment.text}
              </p>

              {/* شريط أزرار سفلي: تفاعل + رد + ملخّص التفاعلات */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFor(comment.id, "reactions", e.currentTarget);
                  }}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                    text-[13px] font-bold transition
                    ${myReaction
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"}
                  `}
                >
                  {myReaction ? (
                    <>
                      <span aria-hidden className="text-base leading-none">
                        {getReactionMeta(myReaction)?.emoji}
                      </span>
                      <span>{getReactionMeta(myReaction)?.label}</span>
                    </>
                  ) : (
                    <>
                      <SmilePlus size={15} />
                      <span>تفاعل</span>
                    </>
                  )}
                </button>

                {!isReply && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplyAction(comment);
                    }}
                    className="
                      inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                      text-[13px] font-bold text-slate-500
                      transition hover:bg-slate-100 hover:text-slate-700
                      dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
                    "
                  >
                    رد
                  </button>
                )}

                {summary.total > 0 && (
                  <div
                    className="
                      ms-auto inline-flex items-center gap-1
                      rounded-full bg-slate-100 px-2.5 py-1
                      text-[12px] font-bold text-slate-600
                      dark:bg-slate-800/70 dark:text-slate-300
                    "
                    title={`${summary.total} تفاعل`}
                  >
                    <span className="inline-flex">
                      {summary.top3.map((t) => (
                        <span
                          key={t.key}
                          className="text-base leading-none"
                          aria-hidden
                        >
                          {getReactionMeta(t.key)?.emoji}
                        </span>
                      ))}
                    </span>
                    <span className="tabular-nums">{summary.total}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* الردود */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((r) => renderComment(r, true))}
          </div>
        )}
      </div>
    );
  };

  // ----------------------------------------------------------------
  // الـUI الكلّي
  // ----------------------------------------------------------------
  const activeComment = ui.open
    ? comments.find((c) => c.id === ui.open!.commentId) || null
    : null;

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-brand-700 dark:text-brand-300" />
        <h3 className="text-base font-black dark:text-white">
          التعليقات ({comments.length})
        </h3>
      </div>

      {!commentsEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          التعليقات مغلقة لهذا الإعلان.
        </div>
      ) : (
        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          {ui.replyTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 px-3 py-2 text-xs dark:border-brand-900/40 dark:bg-brand-900/20">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-brand-700 dark:text-brand-200">
                  ردّ على {ui.replyTo.userName}:
                </span>{" "}
                <span className="text-slate-600 dark:text-slate-300">
                  {ui.replyTo.text.length > 80
                    ? ui.replyTo.text.slice(0, 80) + "…"
                    : ui.replyTo.text}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUi((s) => ({ ...s, replyTo: null }))}
                className="text-slate-500 hover:text-rose-600"
                aria-label="إلغاء الرد"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              ui.replyTo
                ? "اكتب ردّك..."
                : user
                ? "اكتب تعليقك هنا..."
                : "سجّل الدخول حتى تتمكن من التعليق"
            }
            disabled={!user || sending}
            rows={3}
            className="w-full resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 dark:bg-slate-900"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              كن محترمًا في التعليقات.
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canPost}
              className="btn-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? "جارٍ الإرسال..." : ui.replyTo ? "إرسال الرد" : "إضافة تعليق"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
          لا توجد تعليقات بعد.
        </div>
      ) : (
        <div className="space-y-3">{roots.map((c) => renderComment(c, false))}</div>
      )}

      {/* Portals: شريط التفاعلات وقائمة الخيارات */}
      {ui.open?.kind === "reactions" && activeComment && (
        <CommentReactionBar
          anchorRect={ui.open.rect}
          current={
            user
              ? ((activeComment.reactions?.[user.uid] as CommentReactionKey) ?? null)
              : null
          }
          onSelect={(key) => void handleReact(activeComment, key)}
          onClose={() => setUi((s) => ({ ...s, open: null }))}
        />
      )}
      {ui.open?.kind === "menu" && activeComment && (
        <CommentContextMenu
          anchorRect={ui.open.rect}
          canDelete={Boolean(
            user?.uid === activeComment.userId ||
              user?.uid === ownerId ||
              isAdmin
          )}
          isOwnComment={user?.uid === activeComment.userId}
          onAction={(a) => handleMenuAction(activeComment, a)}
          onClose={() => setUi((s) => ({ ...s, open: null }))}
        />
      )}

      {/* لاستخدام COMMENT_REACTIONS في الـtsx بدون تحذير "unused" */}
      <span hidden aria-hidden>{COMMENT_REACTIONS.length}</span>

      {/* Dialog الإبلاغ - يُفتح من handleReport ويرسل البلاغ لنظام
          الإشراف الجديد (/admin/moderation/reports). */}
      {reportComment && (
        <ReportDialog
          open={true}
          onClose={() => setReportComment(null)}
          targetType="comment"
          targetId={reportComment.id}
          targetMeta={{
            ownerId: reportComment.userId,
            parentListingId: listingId,
            snapshot: reportComment.text,
          }}
        />
      )}
    </div>
  );
}
