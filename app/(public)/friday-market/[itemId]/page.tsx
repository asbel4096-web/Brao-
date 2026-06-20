"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  Phone,
  Flame,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  buildChatId,
  formatPrice,
  normalizeLibyanPhone,
} from "@/lib/utils";
import {
  fridayCategoryLabel,
  type FridayMarketItem,
} from "@/lib/friday-market/types";
import { trackFridayView } from "@/lib/friday-market/track-view";
import { MarketItemCard } from "@/components/friday-market/market-item-card";
import { ReportButton } from "@/components/report/report-button";
import { EditSheet } from "@/components/friday-market/edit-sheet";

export default function FridayItemPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [item, setItem] = useState<FridayMarketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [similar, setSimilar] = useState<FridayMarketItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // جلب الإعلان
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "fridayMarket", itemId));
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setItem({ id: snap.id, ...(snap.data() as Omit<FridayMarketItem, "id">) });
          // تسجيل مشاهدة (مرّة لكل زائر — الخادم يضمن ذلك)
          trackFridayView(snap.id);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // إعلانات مشابهة
  useEffect(() => {
    let cancelled = false;
    if (!item) return;
    (async () => {
      try {
        const q = query(
          collection(db, "fridayMarket"),
          where("weekKey", "==", item.weekKey),
          where("status", "==", "active"),
          where("category", "==", item.category),
          limit(7)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setSimilar(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FridayMarketItem, "id">) }))
            .filter((it) => it.id !== item.id)
            .slice(0, 6)
        );
      } catch {
        /* تجاهل */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  const startChat = async () => {
    if (!user) {
      router.push(`/login?redirect=/friday-market/${itemId}`);
      return;
    }
    if (!item) return;
    if (item.ownerId === user.uid) {
      toast.warning("لا يمكنك مراسلة إعلانك الخاص");
      return;
    }
    setChatLoading(true);
    try {
      const chatId = buildChatId(user.uid, item.ownerId, `fm_${item.id}`);
      await setDoc(
        doc(db, "chats", chatId),
        {
          listingId: `fm:${item.id}`,
          listingTitle: item.title,
          listingImage: item.images?.[0] || "",
          participants: [user.uid, item.ownerId].sort(),
          participantsInfo: {
            [user.uid]: {
              name:
                profile?.businessName ||
                profile?.name ||
                user.displayName ||
                "مستخدم",
              photoURL: profile?.photoURL || user.photoURL || "",
            },
            [item.ownerId]: {
              name: item.ownerName || "مستخدم",
              photoURL: item.ownerPhotoURL || "",
            },
          },
        },
        { merge: true }
      );
      router.push(`/messages/${chatId}`);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر فتح الدردشة");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-action-500" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container py-16 text-center" dir="rtl">
        <div className="text-4xl">🛒</div>
        <p className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">
          الإعلان غير موجود
        </p>
        <Link
          href="/friday-market"
          className="mt-4 inline-block rounded-full bg-action-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          العودة للسوق
        </Link>
      </div>
    );
  }

  const wa = normalizeLibyanPhone(item.whatsapp || item.phone || "");
  const isOwner = !!user && item.ownerId === user.uid;

  const deleteItem = async () => {
    if (!confirm("حذف هذا العرض نهائياً؟")) return;
    setDeleting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/friday-market/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "تعذّر الحذف");
      toast.success("تم حذف العرض");
      router.replace("/friday-market");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحذف");
      setDeleting(false);
    }
  };

  return (
    <div className="pb-28" dir="rtl">
      {/* شريط علوي */}
      <div className="container flex items-center gap-2 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={22} />
        </button>
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-orange-500 to-red-600 px-2.5 py-1 text-[11px] font-black text-white">
          <Flame size={12} /> عرض الجمعة
        </span>

        <div className="ms-auto">
          {isOwner ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Pencil size={12} /> تعديل
              </button>
              <button
                onClick={deleteItem}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-600 active:scale-95 disabled:opacity-50 dark:border-rose-900/50 dark:bg-slate-900"
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                حذف
              </button>
            </div>
          ) : (
            <ReportButton
              targetType="fridayMarket"
              targetId={item.id}
              targetMeta={{
                title: item.title,
                ownerId: item.ownerId,
                snapshot: `سوق الجمعة — ${item.title} — ${formatPrice(item.price)}`,
              }}
              variant="text"
            />
          )}
        </div>
      </div>

      <EditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        item={item}
        onUpdated={(fields) =>
          setItem((prev) => (prev ? { ...prev, ...fields } : prev))
        }
      />

      {/* معرض الصور */}
      <div className="container">
        <div className="overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
          <div className="aspect-square w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.images?.[activeImg] || item.images?.[0]}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        {(item.images?.length ?? 0) > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {item.images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={[
                  "h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2",
                  i === activeImg ? "ring-action-500" : "ring-transparent",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* السعر + الاسم */}
      <div className="container mt-4">
        <p className="text-3xl font-black text-action-600 tabular-nums dark:text-action-400">
          {formatPrice(item.price)}
        </p>
        <h1 className="mt-1 text-lg font-black leading-snug text-slate-900 dark:text-white">
          {item.title}
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-400">
          {fridayCategoryLabel(item.category)}
          {item.city ? ` · ${item.city}` : ""} · {item.ownerName}
        </p>
      </div>

      {/* إعلانات مشابهة */}
      {similar.length > 0 && (
        <div className="mt-7">
          <h2 className="container mb-2 text-base font-black text-slate-900 dark:text-white">
            عروض مشابهة
          </h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {similar.map((it) => (
              <div key={it.id} className="w-[150px] shrink-0">
                <MarketItemCard item={it} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* أزرار التواصل الثابتة */}
      <div
        className="fixed inset-x-0 bottom-0 z-[55] border-t border-slate-100 bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="container flex items-center gap-2">
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white active:scale-95"
          >
            <MessageCircle size={18} /> واتساب
          </a>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startChat}
            disabled={chatLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white active:scale-95 disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            <MessageCircle size={18} /> {chatLoading ? "..." : "مراسلة"}
          </motion.button>
          <a
            href={item.phone ? `tel:${item.phone}` : "#"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-action-500 py-3 text-sm font-black text-white active:scale-95"
          >
            <Phone size={18} /> اتصال
          </a>
        </div>
      </div>
    </div>
  );
}
