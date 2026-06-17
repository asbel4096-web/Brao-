"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Clock,
  BadgeCheck,
  ChevronDown,
  Car,
  Zap,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  formatPrice,
  normalizeLibyanPhone,
  buildChatId,
  getTraderDisplayName,
} from "@/lib/utils";
import dynamic from "next/dynamic";
import ListingComments from "@/components/listing-comments";
import { SponsoredSpotlight } from "@/components/sponsored-spotlight";
import { ImageGallery } from "@/components/image-gallery";
import { DynamicSpecs } from "@/components/dynamic-specs";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportButton } from "@/components/report/report-button";
import { OwnerStatsBar } from "@/components/owner-stats-bar";

const SafetyTipsCard = dynamic(
  () => import("@/components/safety-tips-card").then((m) => m.SafetyTipsCard),
  { ssr: true, loading: () => null }
);
const SimilarListings = dynamic(
  () => import("@/components/similar-listings").then((m) => m.SimilarListings),
  { ssr: false, loading: () => null }
);

import type { Listing, UserProfile } from "@/lib/types";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  /* ---------------- جلب البيانات (محفوظ كما هو) ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "listings", params.id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setMissing(true);
          setLoading(false);
          return;
        }

        const data = {
          ...(snap.data() as Omit<Listing, "id">),
          id: snap.id,
        } as Listing;

        setListing(data);
        setLoading(false);

        // سجّل في "شاهدت مؤخراً" (محلياً) — فقط للإعلانات المعتمدة.
        if ((data as any).status === "approved") {
          recordRecentlyViewed(data.id);
        }

        try {
          await updateDoc(ref, { views: increment(1) });
        } catch {}

        try {
          const sellerSnap = await getDoc(doc(db, "users", data.ownerId));
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data() as UserProfile;
            setSeller({ ...sellerData, uid: sellerSnap.id });
          }
        } catch {}
      } catch {
        setMissing(true);
        setLoading(false);
      }
    };

    if (params.id) void load();
  }, [params.id]);

  const sellerName = useMemo(
    () => getTraderDisplayName(seller || { name: listing?.sellerName }),
    [listing?.sellerName, seller]
  );

  /* ---------------- بدء الدردشة (محفوظ كما هو) ---------------- */
  const startChat = async () => {
    if (!user) {
      router.push(`/login?redirect=/listings/${params.id}`);
      return;
    }
    if (!listing) return;
    if (listing.ownerId === user.uid) {
      toast.warning("لا يمكنك بدء دردشة مع إعلانك الخاص.");
      return;
    }

    setChatLoading(true);
    try {
      const chatId = buildChatId(user.uid, listing.ownerId, listing.id);
      const chatRef = doc(db, "chats", chatId);

      // لا نقرأ المحادثة قبل إنشائها (قراءة مستند غير موجود تُرفض بقاعدة
      // المشاركين). نكتب بـ merge: ينشئها إن لم تكن موجودة دون الكتابة فوق
      // محادثة قائمة، وبلا createdAt/unreadCount حتى لا نُصفّر العدّادات.
      await setDoc(
        chatRef,
        {
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.images?.[0] || "",
          participants: [user.uid, listing.ownerId].sort(),
          participantsInfo: {
            [user.uid]: {
              name:
                profile?.businessName ||
                profile?.name ||
                user.displayName ||
                user.email ||
                user.phoneNumber ||
                "مستخدم",
              photoURL: profile?.photoURL || user.photoURL || "",
            },
            [listing.ownerId]: {
              name: sellerName,
              photoURL: seller?.photoURL || "",
            },
          },
        },
        { merge: true }
      );
      router.push(`/messages/${chatId}`);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر فتح الدردشة.");
    } finally {
      setChatLoading(false);
    }
  };

  /* ---------------- Loading / Missing ---------------- */
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-4">
        <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-slate-200" />
        <div className="mt-4 h-8 w-1/2 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-24 w-full animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (missing || !listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-black text-slate-900">الإعلان غير موجود</h1>
        <p className="mt-2 text-slate-500">ربما حُذف أو انتهت صلاحيته.</p>
        <Link
          href="/listings"
          className="mt-6 inline-block rounded-2xl bg-brand-700 px-6 py-3 font-black text-white"
        >
          تصفّح الإعلانات
        </Link>
      </div>
    );
  }

  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const isSponsored =
    listing.featured ||
    (listing as any).vipUntil > Date.now() ||
    (listing as any).boostedUntil > Date.now();
  const isUrgentListing =
    ((listing as any).urgentUntil?.toMillis?.() || 0) > Date.now();
  const isApproved = listing.status === "approved";
  const longDesc = (listing.description || "").length > 180;
  const joinDate = (seller as any)?.createdAt;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-28">
      <div className="mx-auto max-w-2xl px-3 py-3 sm:px-4">
        {/* ============ 1. معرض الصور الرئيسي ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-[22px]"
        >
          <ImageGallery images={listing.images || []} alt={listing.title} />

          {/* شارات فوق الصورة */}
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
            {isSponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white shadow-lg">
                <Star size={12} className="fill-current" /> إعلان مميز
              </span>
            )}
            {isUrgentListing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black text-white shadow-lg">
                <Zap size={12} /> عاجل
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-black text-white shadow">
                <BadgeCheck size={12} /> معتمد
              </span>
            )}
          </div>

          {/* أزرار المشاركة والمفضلة */}
          <div className="absolute left-3 top-3 z-10 flex gap-2">
            <FavoriteButton listing={listing} variant="icon" />
            <ShareButton title={listing.title} text={listing.city} variant="icon" />
          </div>
        </motion.div>

        {/* ============ 3. بطاقة السعر ============ */}
        <Section className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900">{listing.title}</h1>
              <div className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
                <MapPin size={14} />
                {listing.city}
                {listing.address ? ` · ${listing.address}` : ""}
              </div>
            </div>
            <div className="shrink-0 text-left">
              <div className="text-2xl font-black text-[#2563EB]">
                {formatPrice(listing.price)}
              </div>
              <div className="text-[11px] font-bold text-slate-400">قابل للتفاوض</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <BadgeCheck size={13} /> إعلان موثّق
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                <BadgeCheck size={13} /> معتمد
              </span>
            )}
          </div>
        </Section>

        {/* ============ 4. المواصفات حسب القسم (ديناميكية، لا حقل فارغ) ============ */}
        <Section className="mt-3">
          <DynamicSpecs listing={listing} />
        </Section>

        {/* ============ 5. الوصف ============ */}
        <Section className="mt-3">
          <h3 className="mb-2 text-base font-black text-slate-900">الوصف</h3>
          <p
            className={
              "whitespace-pre-line text-[14px] leading-7 text-slate-600 " +
              (!descExpanded && longDesc ? "line-clamp-3" : "")
            }
          >
            {listing.description}
          </p>
          {longDesc && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-black text-[#2563EB]"
            >
              {descExpanded ? "عرض أقل" : "عرض المزيد"}
              <ChevronDown
                size={16}
                className={"transition-transform " + (descExpanded ? "rotate-180" : "")}
              />
            </button>
          )}

          {/* المميزات والعيوب */}
          {(listing.features?.length || listing.defects?.length) ? (
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {listing.features?.length ? (
                <div>
                  <h4 className="mb-2 text-sm font-black text-emerald-700">المميزات</h4>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    {listing.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {listing.defects?.length ? (
                <div>
                  <h4 className="mb-2 text-sm font-black text-rose-700">عيوب وملاحظات</h4>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    {listing.defects.map((d) => (
                      <li key={d} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Section>

        {/* ============ 6. معلومات التاجر ============ */}
        <Section className="mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">معلومات التاجر</h3>
            <Link
              href={`/traders/${listing.ownerId}`}
              className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-[#2563EB]"
            >
              عرض المعرض
            </Link>
          </div>

          <Link
            href={`/traders/${listing.ownerId}`}
            className="mt-3 flex items-center gap-3"
          >
            {seller?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.photoURL}
                alt={sellerName}
                className="h-14 w-14 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-lg font-black text-white">
                {sellerName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-black text-slate-900">
                  {sellerName}
                </span>
                {(seller as any)?.isVerifiedDealer && (
                  <BadgeCheck size={16} className="shrink-0 text-[#2563EB]" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                <BadgeCheck size={12} /> تاجر موثّق
              </div>
            </div>
          </Link>

          {/* صف معلومات */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <MiniStat
              icon={MapPin}
              label="الموقع"
              value={seller?.city || listing.city || "-"}
            />
            <MiniStat
              icon={Clock}
              label="متوسط الرد"
              value="خلال ساعة"
            />
            <MiniStat
              icon={Star}
              label="التقييم"
              value={`${Number(seller?.averageRating || 0).toFixed(1)} ★`}
            />
          </div>
        </Section>

        {/* إحصائيات المالك (محفوظ) */}
        <div className="mt-3">
          <OwnerStatsBar
            listingId={listing.id}
            ownerId={listing.ownerId}
            initialViews={listing.views}
            variant="compact"
          />
        </div>

        {/* الموقع على الخريطة */}
        {listing.mapLink ? (
          <Section className="mt-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#2563EB]" />
              <h3 className="text-base font-black text-slate-900">الموقع</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {listing.city}
              {listing.address ? ` · ${listing.address}` : ""}
            </p>
            <a
              href={listing.mapLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700"
            >
              <MapPin size={16} /> فتح الخريطة
            </a>
          </Section>
        ) : null}

        {/* ============ 7. الإعلانات المشابهة ============ */}
        {/* إعلانات ممولة مشابهة (نفس الفئة) — أعلى المشابهة العادية */}
        <SponsoredSpotlight
          category={listing.category}
          excludeId={listing.id}
          title="إعلانات ممولة مشابهة"
          bare
        />
        <div className="mt-3">
          <SimilarListings listing={listing} />
        </div>

        {/* التعليقات */}
        <div id="comments" className="mt-3 scroll-mt-24">
          <ListingComments
            listingId={listing.id}
            commentsEnabled={listing.commentsEnabled !== false}
            ownerId={listing.ownerId}
          />
        </div>

        <div className="mt-3">
          <SafetyTipsCard />
        </div>

        {/* زر الإبلاغ */}
        <div className="mt-3 flex justify-center">
          <ReportButton
            targetType="listing"
            targetId={listing.id}
            targetMeta={{ title: listing.title, ownerId: listing.ownerId }}
            variant="text"
          />
        </div>
      </div>

      {/* ============ 8. شريط التواصل الثابت ============ */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-3 py-3">
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-4 py-3.5 text-sm font-black text-white shadow-sm transition active:scale-95"
            >
              <MessageCircle size={18} /> واتساب
            </a>
          ) : (
            <button
              type="button"
              onClick={() => void startChat()}
              disabled={chatLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-4 py-3.5 text-sm font-black text-white shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              <MessageCircle size={18} /> {chatLoading ? "..." : "مراسلة"}
            </button>
          )}

          <a
            href={listing.phone ? `tel:${listing.phone}` : "#"}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-sm font-black text-white shadow-sm transition active:scale-95"
          >
            <Phone size={18} /> اتصال
          </a>
        </div>
      </div>
    </div>
  );
}

/* ================= مكوّنات مساعدة ================= */

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={
        "rounded-[20px] bg-white p-4 shadow-[0_2px_16px_-8px_rgba(15,23,42,0.1)] " +
        className
      }
    >
      {children}
    </motion.section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon size={16} className="mx-auto text-slate-400" />
      <div className="mt-1 truncate text-xs font-black text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
