"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  Tag,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerOnly } from "@/components/owner-only";
import type {
  CarStoryPayload,
  OfferStoryPayload,
  ServiceStoryPayload,
  StoryDisplayItem,
} from "@/lib/stories/types";
import { timeAgo } from "@/lib/stories/helpers";
import { normalizeLibyanPhone } from "@/lib/utils";

interface Props {
  /** كل قصص نفس المالك */
  stories: StoryDisplayItem[];
  /** فهرس القصة الأولى للعرض */
  startIndex?: number;
  onClose: () => void;
  /** استدعاء عند انتهاء كل قصص هذا المالك (للانتقال للمالك التالي) */
  onCompleteOwner?: () => void;
}

/** مدة عرض كل قصة - 5 ثوان */
const STORY_DURATION_MS = 5000;

export function StoryViewer({
  stories,
  startIndex = 0,
  onClose,
  onCompleteOwner,
}: Props) {
  const { user } = useAuth();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const viewedRef = useRef<Set<string>>(new Set());

  const current = stories[index];

  /* ----------------------------------------------------------
   * تسجيل المشاهدة عند تغيّر القصة
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!current) return;
    if (viewedRef.current.has(current.id)) return;
    if (user && user.uid === current.ownerId) {
      // المالك لا يحسب لنفسه مشاهدة
      viewedRef.current.add(current.id);
      return;
    }
    viewedRef.current.add(current.id);

    const recordView = async () => {
      try {
        // 1) زيادة العداد الإجمالي
        await updateDoc(doc(db, "stories", current.id), {
          viewsCount: increment(1),
        });

        // 2) سجل المشاهد (لقائمة المشاهدين الخاصة بالمالك - اختيارية)
        if (user) {
          await setDoc(
            doc(db, "stories", current.id, "viewers", user.uid),
            {
              userId: user.uid,
              viewedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch {
        // تسجيل المشاهدة ليس حرجاً
      }
    };
    void recordView();
  }, [current, user]);

  /* ----------------------------------------------------------
   * التقدم الزمني للقصة الحالية
   * ---------------------------------------------------------- */
  useEffect(() => {
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = Date.now();
  }, [index]);

  useEffect(() => {
    if (paused) {
      elapsedBeforePauseRef.current += Date.now() - startedAtRef.current;
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    startedAtRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed =
        elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current);
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        next();
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, index]);

  /* ----------------------------------------------------------
   * التنقل
   * ---------------------------------------------------------- */
  const next = () => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      onCompleteOwner?.();
      onClose();
    }
  };

  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") prev();
      if (e.key === "ArrowLeft") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // قفل scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* الصورة كخلفية */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${current.imageUrl})` }}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"
      />

      {/* الحاوية */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col text-white">
        {/* أشرطة التقدم */}
        <div className="flex gap-1 p-3">
          {stories.map((_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white transition-all"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* رأس: صورة المالك + الاسم + الوقت + إغلاق */}
        <div className="flex items-center gap-3 px-4 pb-2">
          {current.ownerPhotoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.ownerPhotoURL}
              alt={current.ownerName}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-black ring-2 ring-white/50">
              {(current.ownerName || "م").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{current.ownerName}</p>
            <p className="text-[11px] text-white/70">
              {timeAgo(current.createdAtMs)}
            </p>
          </div>

          {/* العداد للمالك فقط */}
          <OwnerOnly ownerId={current.ownerId}>
            <div
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur"
              title="عدد المشاهدات (يظهر لك فقط)"
            >
              <Eye size={12} />
              {(current.viewsCount ?? 0).toLocaleString("ar-LY")}
            </div>
          </OwnerOnly>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* المحتوى - منطقة قابلة للنقر للتنقل */}
        <div className="relative flex-1">
          {/* النصف الأيمن (RTL: السابق) */}
          <button
            type="button"
            onClick={prev}
            className="absolute inset-y-0 right-0 z-10 w-1/3"
            aria-label="السابق"
          />
          {/* النصف الأيسر (RTL: التالي) */}
          <button
            type="button"
            onClick={next}
            className="absolute inset-y-0 left-0 z-10 w-1/3"
            aria-label="التالي"
          />

          {/* أزرار جانبية صغيرة (للديسكتوب) */}
          <button
            type="button"
            onClick={prev}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            aria-label="السابق"
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            aria-label="التالي"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* الـ caption والإجراءات في الأسفل */}
        <div className="relative z-20 p-4 pb-6">
          <StoryCaption story={current} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * StoryCaption - يعرض الحقول حسب النوع + أزرار اتصال/واتساب
 * ============================================================ */

function StoryCaption({ story }: { story: StoryDisplayItem }) {
  const { type, payload } = story;

  if (type === "car") {
    const p = payload as CarStoryPayload;
    return (
      <div className="rounded-3xl bg-black/45 p-4 backdrop-blur-md">
        <h3 className="text-lg font-black leading-tight">{p.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
          {typeof p.price === "number" && p.price > 0 && (
            <span className="rounded-full bg-brand-700/90 px-2 py-0.5 text-sm font-black">
              {p.price.toLocaleString("ar-LY")} د.ل
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {p.city}
          </span>
        </div>
        <ContactButtons phone={p.phone} whatsapp={p.whatsapp}>
          {p.listingId && (
            <Link
              href={`/listings/${p.listingId}`}
              className="btn-primary !flex-1 !py-2.5 !text-xs"
            >
              فتح الإعلان
            </Link>
          )}
        </ContactButtons>
      </div>
    );
  }

  if (type === "service") {
    const p = payload as ServiceStoryPayload;
    return (
      <div className="rounded-3xl bg-black/45 p-4 backdrop-blur-md">
        <h3 className="text-lg font-black leading-tight">{p.serviceName}</h3>
        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/85">
          {p.description}
        </p>
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-white/85">
          <MapPin size={12} /> {p.city}
        </div>
        <ContactButtons phone={p.phone} whatsapp={p.whatsapp} />
      </div>
    );
  }

  // offer
  const p = payload as OfferStoryPayload;
  return (
    <div className="rounded-3xl bg-black/45 p-4 backdrop-blur-md">
      <div className="inline-flex items-center gap-1 rounded-full bg-action-500 px-3 py-1 text-xs font-black">
        <Tag size={12} /> عرض خاص
      </div>
      <h3 className="mt-2 text-lg font-black leading-tight">{p.title}</h3>
      <p className="mt-1 text-base font-black text-action-300">{p.discount}</p>
      <div className="mt-2 inline-flex items-center gap-1 text-xs text-white/85">
        <MapPin size={12} /> {p.city}
      </div>
      <ContactButtons phone={p.phone} whatsapp={p.whatsapp} />
    </div>
  );
}

function ContactButtons({
  phone,
  whatsapp,
  children,
}: {
  phone?: string;
  whatsapp?: string;
  children?: React.ReactNode;
}) {
  const wa = normalizeLibyanPhone(whatsapp || phone || "");
  if (!phone && !whatsapp && !children) return null;
  return (
    <div className="mt-3 flex items-stretch gap-2">
      {children}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="
            inline-flex flex-1 items-center justify-center gap-1.5
            rounded-2xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white
            backdrop-blur transition hover:bg-white/25
          "
        >
          <Phone size={14} /> اتصال
        </a>
      )}
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          className="
            inline-flex flex-1 items-center justify-center gap-1.5
            rounded-2xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-white
            transition hover:bg-emerald-600
          "
        >
          <MessageCircle size={14} /> واتساب
        </a>
      )}
    </div>
  );
}
