"use client";

/**
 * بطاقة منشور المجتمع — نظير FridayFeedPost في التطبيق:
 * رأس (الكاتب + الوقت + المدينة) → وسم النوع → العنوان والنص → الصور → سعر/ميزانية/فئة/حالة
 * → ملخّص التفاعل → (إعجاب · تعليق · مشاركة) → تواصل (واتساب/اتصال) للأنواع التجارية.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Share2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { formatNumber, formatPrice, timeAgo } from "@/lib/utils";
import {
  type CommunityPost,
  showsBudget,
  showsCategory,
  showsCondition,
  showsPrice,
  showsTitle,
  toggleLike,
  typeLabel,
  waLink,
  watchLiked,
} from "@/lib/community/posts";

export function PostCard({
  post,
  inDetail = false,
}: {
  post: CommunityPost;
  inDetail?: boolean;
}) {
  const p = post;
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [liked, setLiked] = useState(false);
  const [likeDelta, setLikeDelta] = useState(0);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(inDetail);

  useEffect(() => {
    setLikeDelta(0);
    if (!user) {
      setLiked(false);
      return;
    }
    return watchLiked(p.id, user.uid, (v) => {
      setLiked(v);
      setLikeDelta(0);
    });
  }, [p.id, user]);

  const href = `/friday-market/post/${p.id}`;
  const t = p.type;
  const likes = Math.max(0, p.likesCount + likeDelta);
  const showT = showsTitle(t) && p.title.trim().length > 0;
  const showP = showsPrice(t) && p.price != null;
  const showB = showsBudget(t) && p.budget != null;
  const showC = showsCategory(t) && p.category.trim().length > 0;
  const showCond = showsCondition(t) && p.condition.trim().length > 0;
  const contact = p.whatsapp || p.phone;
  const hasContact = !!contact && t !== "question";
  const longText = p.text.length > 280;

  const onLike = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(href)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeDelta((d) => d + (wasLiked ? -1 : 1));
    try {
      await toggleLike(p.id, user.uid);
    } catch {
      setLiked(wasLiked);
      setLikeDelta(0);
      toast.error("تعذّر تسجيل الإعجاب");
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    const url = `${window.location.origin}${href}`;
    const text = [p.title.trim(), p.text.trim()].filter(Boolean).join(" — ");
    try {
      if (navigator.share) {
        await navigator.share({ title: "منشورات المجتمع", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("تم نسخ رابط المنشور");
    } catch {
      /* أُلغيت المشاركة */
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      {/* الرأس */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={p.authorName} url={p.authorPhotoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-black text-slate-900 dark:text-white">
              {p.authorName.trim() || "عضو"}
            </span>
            {p.authorVerified && (
              <BadgeCheck size={15} className="shrink-0 text-brand-600" aria-label="موثّق" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{timeAgo(p.createdAt ?? p.submittedAt ?? null)}</span>
            {p.city && (
              <>
                <span>·</span>
                <MapPin size={11} />
                <span>{p.city}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* وسم النوع */}
      <div className="px-4 pb-1.5 pt-2">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {typeLabel(t)}
        </span>
      </div>

      {/* العنوان + النص */}
      {(showT || p.text.trim()) && (
        <div className="px-4 pb-3">
          {showT && (
            <Link href={href} prefetch={false} className="block text-base font-black text-slate-900 dark:text-white">
              {p.title.trim()}
            </Link>
          )}
          {p.text.trim() && (
            <p
              className={`mt-1 whitespace-pre-line text-[14px] leading-7 text-slate-700 dark:text-slate-200 ${
                !expanded && longText ? "line-clamp-5" : ""
              }`}
            >
              {p.text.trim()}
            </p>
          )}
          {!expanded && longText && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 text-[13px] font-black text-brand-700 dark:text-brand-300"
            >
              عرض المزيد
            </button>
          )}
        </div>
      )}

      {/* الصور */}
      {p.images.length > 0 && <MediaGrid images={p.images} href={href} inDetail={inDetail} />}

      {/* سعر/ميزانية/فئة/حالة */}
      {(showP || showB || showC || showCond) && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {showP && <Chip strong>{formatPrice(p.price)}</Chip>}
          {showB && <Chip strong>الميزانية: {formatPrice(p.budget)}</Chip>}
          {showC && <Chip>{p.category}</Chip>}
          {showCond && <Chip>{p.condition}</Chip>}
        </div>
      )}

      {/* ملخّص التفاعل */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        <span>{likes > 0 ? `${formatNumber(likes)} إعجاب` : ""}</span>
        <span>{p.commentsCount > 0 ? `${formatNumber(p.commentsCount)} تعليق` : ""}</span>
      </div>

      {/* شريط التفاعل */}
      <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800">
        <Action onClick={onLike} active={liked} disabled={busy}>
          <Heart size={18} className={liked ? "fill-rose-500 text-rose-500" : ""} />
          {liked ? "أعجبني" : "إعجاب"}
        </Action>
        <Action onClick={() => router.push(`${href}#comments`)}>
          <MessageCircle size={18} />
          تعليق
        </Action>
        <Action onClick={onShare}>
          <Share2 size={18} />
          مشاركة
        </Action>
      </div>

      {/* تواصل */}
      {hasContact && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <a
            href={waLink(contact!)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <MessageSquareText size={16} />
            واتساب
          </a>
          <a
            href={`tel:${p.phone || contact}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Phone size={16} />
            اتصال
          </a>
        </div>
      )}

      {/* عرض كل التعليقات (في القائمة فقط) */}
      {!inDetail && p.commentsCount > 0 && (
        <Link
          href={`${href}#comments`}
          prefetch={false}
          className="block border-t border-slate-100 px-4 py-3 text-[12px] font-bold text-slate-500 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400"
        >
          عرض جميع التعليقات ({formatNumber(p.commentsCount)})
        </Link>
      )}
    </article>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  const initial = (name.trim() || "ع").charAt(0);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

function Chip({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-black ${
        strong
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

function Action({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-1.5 text-[13px] font-black transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800 ${
        active ? "text-rose-600" : "text-slate-600 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

/** شبكة الصور: 1 كاملة، 2 جنباً، 3 = كبيرة + اثنتان، 4+ = 2×2 مع «+N». */
function MediaGrid({ images, href, inDetail }: { images: string[]; href: string; inDetail: boolean }) {
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  const cell = (src: string, i: number, cls: string) => (
    <a
      key={i}
      href={inDetail ? src : href}
      target={inDetail ? "_blank" : undefined}
      rel={inDetail ? "noopener noreferrer" : undefined}
      className={`relative block overflow-hidden bg-slate-100 dark:bg-slate-800 ${cls}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      {i === shown.length - 1 && extra > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-black text-white">
          +{extra}
        </span>
      )}
    </a>
  );
  if (shown.length === 1) return <div className="aspect-[4/3]">{cell(shown[0], 0, "h-full w-full")}</div>;
  if (shown.length === 2)
    return <div className="grid aspect-[2/1] grid-cols-2 gap-0.5">{shown.map((s, i) => cell(s, i, "h-full"))}</div>;
  if (shown.length === 3)
    return (
      <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5">
        {cell(shown[0], 0, "row-span-2 h-full")}
        {cell(shown[1], 1, "h-full")}
        {cell(shown[2], 2, "h-full")}
      </div>
    );
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5">
      {shown.map((s, i) => cell(s, i, "h-full"))}
    </div>
  );
}
