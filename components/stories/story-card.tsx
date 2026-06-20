"use client";

import { memo } from "react";
import Image from "next/image";
import { Play, Wrench } from "lucide-react";
import type { StoryDisplayItem } from "@/lib/stories/types";

const FALLBACK = "/icons/car-card.svg";

interface Props {
  stories: StoryDisplayItem[];
  seen?: boolean;
  onClick: () => void;
}

/**
 * StoryCard — بطاقة قصة كبيرة عمودية (نمط Facebook/Marketplace Stories):
 *  - صورة القصة تملأ البطاقة.
 *  - شعار المعرض دائري بحلقة متدرّجة أعلى اليمين (رمادية إن شوهدت).
 *  - اسم المعرض أسفل البطاقة فوق تدرّج داكن.
 *  - مؤشّر فيديو + شارة عدد القصص + وسم خدمة.
 */
function StoryCardImpl({ stories, seen = false, onClick }: Props) {
  const first = stories[0];
  const owner = first.ownerName || "مستخدم";

  const firstMedia = first.media[0];
  const videoUrl = firstMedia?.kind === "video" ? firstMedia.url : null;
  // صورة غلاف حقيقية (poster) إن وُجدت — وليست رابط الفيديو نفسه
  const posterImage =
    [first.coverUrl, firstMedia?.thumbnailUrl].find(
      (u) => u && u !== videoUrl
    ) || null;
  const coverImg = posterImage || FALLBACK;
  // الأيقونة لا تأخذ رابط فيديو أبداً (تفادياً للصورة المكسورة)
  const avatar = first.ownerPhotoURL || posterImage || FALLBACK;

  const hasVideo = stories.some((s) => s.media.some((m) => m.kind === "video"));
  const isService = first.type === "service";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`قصص ${owner}`}
      className="
        group relative h-[184px] w-[124px] shrink-0 overflow-hidden rounded-3xl
        bg-slate-200 ring-1 ring-slate-200 transition active:scale-[0.97]
        focus:outline-none dark:bg-slate-800 dark:ring-slate-800
        sm:h-[210px] sm:w-[142px]
      "
    >
      {/* خلفية القصة — صورة خفيفة فقط (لا نُركّب فيديو في الصف حفاظاً على
          خفّة الرئيسية؛ الفيديو يُشغَّل داخل المشغّل عند الفتح فقط). */}
      {posterImage ? (
        <Image
          src={posterImage}
          alt={owner}
          fill
          sizes="142px"
          referrerPolicy="no-referrer"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : videoUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
          <Play size={34} className="text-white/70" fill="currentColor" />
        </div>
      ) : (
        <Image
          src={coverImg}
          alt={owner}
          fill
          sizes="142px"
          referrerPolicy="no-referrer"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {/* تدرّج علوي خفيف + سفلي داكن لقراءة الاسم */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />

      {/* شعار المعرض — حلقة متدرّجة (رمادية إن شوهدت) */}
      <span
        className={[
          "absolute right-2.5 top-2.5 rounded-full p-[2.5px] shadow-md transition-transform group-active:scale-95",
          seen
            ? "bg-slate-300/80 dark:bg-slate-500/80"
            : "bg-gradient-to-br from-brand-500 via-action-500 to-brand-600",
        ].join(" ")}
      >
        <span className="block rounded-full bg-white p-[2px] dark:bg-slate-950">
          <Image
            src={avatar}
            alt=""
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover"
          />
        </span>
      </span>

      {/* مؤشّر فيديو */}
      {hasVideo && (
        <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
          <Play size={12} className="translate-x-[1px]" fill="currentColor" />
        </span>
      )}

      {/* وسم خدمة */}
      {isService && (
        <span className="absolute left-2.5 top-11 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <Wrench size={11} />
        </span>
      )}

      {/* شارة عدد القصص */}
      {stories.length > 1 && (
        <span className="absolute left-2.5 bottom-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-action-500 px-1.5 text-[10px] font-black text-white shadow">
          {stories.length}
        </span>
      )}

      {/* اسم المعرض */}
      <span className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="line-clamp-2 text-right text-[12px] font-black leading-tight text-white drop-shadow-md">
          {owner}
        </span>
      </span>
    </button>
  );
}

export const StoryCard = memo(StoryCardImpl);
export default StoryCard;
