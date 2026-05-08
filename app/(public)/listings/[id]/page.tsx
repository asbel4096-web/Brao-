"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Calendar,
  Fuel,
  Gauge,
  MapPin,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  buildChatId,
  formatPrice,
  getTraderDisplayName,
} from "@/lib/utils";
import ListingComments from "@/components/listing-comments";
import { ImageGallery } from "@/components/image-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { SafetyTipsCard } from "@/components/safety-tips-card";
import { ListingQualityCard } from "@/components/listing-quality-card";
import { OwnerStatsBar } from "@/components/owner-stats-bar";
import { SellerCard } from "@/components/seller-card";
import { ListingStickyCta } from "@/components/listing-sticky-cta";
import { ListingActionsBar } from "@/components/listing-actions-bar";
import type { Listing, UserProfile } from "@/lib/types";

/**
 * صفحة تفاصيل الإعلان - أهم صفحة في التطبيق.
 *
 * الهرمية البصرية (top → bottom على الموبايل):
 *   1. معرض صور احترافي بـ swipe + dots + zoom.
 *   2. كرت السعر (السعر بارز + التصنيف).
 *   3. العنوان + الموقع.
 *   4. مواصفات سريعة (4 أهم: السنة/العداد/الوقود/الناقل).
 *   5. بطاقة البائع (ثقة).
 *   6. الوصف الكامل.
 *   7. مواصفات إضافية + مميزات + عيوب.
 *   8. شريط التفاعل (لايك/تعليق/مشاركة/مفضلة).
 *   9. الإحصائيات الخاصة (للمالك).
 *  10. الموقع + الخريطة.
 *  11. التعليقات.
 *  12. نصائح الأمان.
 *
 * + Sticky CTA bar على الموبايل (واتساب/اتصال/مراسلة).
 */

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

  /* ----------------------------------------------------------
   * تحميل الإعلان + بيانات البائع
   * ---------------------------------------------------------- */
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

        // عدّاد المشاهدات (غير حرج)
        try {
          await updateDoc(ref, { views: increment(1) });
        } catch {
          /* تجاهل */
        }

        // بيانات البائع
        try {
          const sellerSnap = await getDoc(doc(db, "users", data.ownerId));
          if (sellerSnap.exists()) {
            setSeller({
              ...(sellerSnap.data() as UserProfile),
              uid: sellerSnap.id,
            });
          }
        } catch {
          /* تجاهل */
        }
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

  /* ----------------------------------------------------------
   * بدء دردشة جديدة
   * ---------------------------------------------------------- */
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
      const existing = await getDoc(chatRef);

      if (!existing.exists()) {
        await setDoc(chatRef, {
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
          unreadCount: { [user.uid]: 0, [listing.ownerId]: 0 },
          createdAt: serverTimestamp(),
        });
      }

      router.push(`/messages/${chatId}`);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر فتح الدردشة.");
    } finally {
      setChatLoading(false);
    }
  };

  /* ----------------------------------------------------------
   * Loading state
   * ---------------------------------------------------------- */
  if (loading) {
    return (
      <section className="container py-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="skeleton h-32" />
            <div className="skeleton h-64" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-40" />
            <div className="skeleton h-32" />
          </div>
        </div>
      </section>
    );
  }

  if (missing || !listing) return notFound();

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <>
      <section
        className="
          container py-4 sm:py-6
          lg:pb-8 pb-32
        "
      >
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:gap-6">
          {/* ============== العمود الرئيسي ============== */}
          <div className="space-y-5">
            {/* 1) معرض الصور + أزرار سريعة فوق الصورة */}
            <div className="relative">
              <ImageGallery
                images={listing.images || []}
                alt={listing.title}
              />

              {/* أزرار مفضلة + مشاركة فوق الصورة (يمين علوي) */}
              <div className="absolute right-4 top-4 z-10 flex gap-2">
                <FavoriteButton listing={listing} variant="icon" />
                <ShareButton
                  title={listing.title}
                  text={listing.city}
                  image={listing.images?.[0]}
                  variant="icon"
                />
              </div>
            </div>

            {/* 2) كرت العنوان + السعر + المواصفات السريعة */}
            <div className="card overflow-hidden p-0">
              {/* السعر بارز فوق - شريط brand */}
              <div
                className="
                  flex items-center justify-between gap-3
                  bg-gradient-to-l from-brand-700 to-brand-800
                  px-5 py-4 text-white sm:px-6
                "
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                    السعر
                  </div>
                  <div className="mt-0.5 text-2xl font-black sm:text-3xl">
                    {formatPrice(listing.price)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black backdrop-blur sm:text-xs">
                    {listing.category}
                  </span>
                  {listing.featured && (
                    <span className="rounded-full bg-action-500 px-2.5 py-1 text-[10px] font-black text-white shadow-action sm:text-xs">
                      ★ مميز
                    </span>
                  )}
                </div>
              </div>

              {/* العنوان + الموقع */}
              <div className="px-5 py-4 sm:px-6">
                <h1 className="text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-2xl">
                  {listing.title}
                </h1>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin size={14} />
                  <span>
                    {listing.city}
                    {listing.address ? ` - ${listing.address}` : ""}
                  </span>
                </div>
              </div>

              {/* مواصفات سريعة (4 أهم) */}
              <div
                className="
                  grid grid-cols-2 divide-x divide-slate-100 border-t
                  border-slate-100 sm:grid-cols-4
                  dark:divide-slate-800 dark:border-slate-800
                  [direction:ltr]
                "
              >
                <SpecCell
                  icon={Calendar}
                  label="السنة"
                  value={listing.year ? String(listing.year) : "—"}
                />
                <SpecCell
                  icon={Gauge}
                  label="العداد"
                  value={
                    listing.mileage
                      ? `${Number(listing.mileage).toLocaleString("ar-LY")} كم`
                      : "—"
                  }
                />
                <SpecCell
                  icon={Fuel}
                  label="الوقود"
                  value={listing.fuel ?? "—"}
                />
                <SpecCell
                  icon={Settings}
                  label="الناقل"
                  value={listing.transmission ?? "—"}
                />
              </div>

              {/* الحالة */}
              {listing.status === "approved" && (
                <div
                  className="
                    flex items-center justify-center gap-1.5 border-t
                    border-slate-100 bg-emerald-50/60 px-4 py-2.5
                    text-[11px] font-bold text-emerald-700
                    dark:border-slate-800 dark:bg-emerald-950/30
                    dark:text-emerald-300 sm:text-xs
                  "
                >
                  <ShieldCheck size={13} />
                  إعلان موثَّق على منصة براتشو كار
                </div>
              )}
            </div>

            {/* 3) بطاقة البائع - في العمود الرئيسي على الجوال (للوصول السريع) */}
            <div className="lg:hidden">
              <SellerCard
                ownerId={listing.ownerId}
                seller={seller}
                fallbackName={listing.sellerName}
              />
            </div>

            {/* 4) الوصف الكامل */}
            {listing.description && (
              <div className="card p-5 sm:p-6">
                <h3 className="mb-3 text-base font-black text-slate-950 dark:text-white">
                  الوصف
                </h3>
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-200">
                  {listing.description}
                </p>
              </div>
            )}

            {/* 5) مواصفات إضافية */}
            {(listing.brand ||
              listing.model ||
              listing.color ||
              listing.engine) && (
              <div className="card p-5 sm:p-6">
                <h3 className="mb-3 text-base font-black text-slate-950 dark:text-white">
                  مواصفات تفصيلية
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {listing.brand && (
                    <DetailRow label="الماركة" value={listing.brand} />
                  )}
                  {listing.model && (
                    <DetailRow label="الموديل" value={listing.model} />
                  )}
                  {listing.color && (
                    <DetailRow label="اللون" value={listing.color} />
                  )}
                  {listing.engine && (
                    <DetailRow label="المحرك" value={listing.engine} />
                  )}
                </div>
              </div>
            )}

            {/* 6) المميزات + العيوب */}
            {(listing.features?.length || listing.defects?.length) ? (
              <div className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                {listing.features?.length ? (
                  <div>
                    <h4 className="mb-3 inline-flex items-center gap-1.5 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        ✓
                      </span>
                      المميزات
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {listing.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-slate-700 dark:text-slate-200"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {listing.defects?.length ? (
                  <div>
                    <h4 className="mb-3 inline-flex items-center gap-1.5 text-sm font-black text-rose-700 dark:text-rose-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                        !
                      </span>
                      عيوب وملاحظات
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {listing.defects.map((defect) => (
                        <li
                          key={defect}
                          className="flex items-start gap-2 text-slate-700 dark:text-slate-200"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                          {defect}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 7) شريط التفاعل */}
            <div className="card p-3 sm:p-4">
              <ListingActionsBar
                listing={listing}
                commentsCount={Number(listing.commentsCount || 0)}
              />
            </div>

            {/* 8) إحصائيات المالك */}
            <OwnerStatsBar
              listingId={listing.id}
              ownerId={listing.ownerId}
              initialViews={listing.views}
              variant="compact"
            />

            {/* 9) جودة الإعلان */}
            <ListingQualityCard listing={listing} />

            {/* 10) الموقع */}
            {(listing.address || listing.mapLink) && (
              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <MapPin
                    size={18}
                    className="text-brand-700 dark:text-brand-300"
                  />
                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    الموقع
                  </h3>
                </div>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {listing.city}
                  {listing.address ? ` - ${listing.address}` : ""}
                </p>

                {listing.mapLink ? (
                  <a
                    href={listing.mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary mt-4"
                  >
                    <MapPin size={16} />
                    فتح في الخريطة
                  </a>
                ) : null}
              </div>
            )}

            {/* 11) التعليقات */}
            <ListingComments
              listingId={listing.id}
              commentsEnabled={listing.commentsEnabled !== false}
              ownerId={listing.ownerId}
            />

            {/* 12) نصائح الأمان */}
            <SafetyTipsCard />
          </div>

          {/* ============== Sidebar (ديسكتوب فقط) ============== */}
          <aside className="hidden space-y-5 lg:block">
            {/* بطاقة البائع - sticky على الديسكتوب */}
            <div className="sticky top-24 space-y-5">
              <SellerCard
                ownerId={listing.ownerId}
                seller={seller}
                fallbackName={listing.sellerName}
              />

              {/* أزرار التواصل (ديسكتوب) */}
              <div className="card p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-black text-slate-950 dark:text-white">
                  تواصل مباشر
                </h3>
                <DesktopContactButtons
                  listing={listing}
                  onChat={startChat}
                  chatLoading={chatLoading}
                />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Sticky CTA على الموبايل فقط */}
      <ListingStickyCta
        listing={listing}
        onChat={startChat}
        chatLoading={chatLoading}
      />
    </>
  );
}

/* ============================================================
 * Helpers / sub-components
 * ============================================================ */

function SpecCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-3 text-center [direction:rtl] sm:py-4">
      <div className="mb-1.5 flex justify-center">
        <span
          className="
            inline-flex h-8 w-8 items-center justify-center
            rounded-xl bg-brand-50 text-brand-700
            dark:bg-brand-900/40 dark:text-brand-300
          "
        >
          <Icon size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 truncate text-xs font-black text-slate-950 dark:text-white sm:text-sm">
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/40">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

/* ============================================================
 * أزرار التواصل للديسكتوب (sidebar)
 * ============================================================ */

function DesktopContactButtons({
  listing,
  onChat,
  chatLoading,
}: {
  listing: Listing;
  onChat: () => void;
  chatLoading: boolean;
}) {
  const wa = listing.whatsapp || listing.phone || "";
  const cleanWa = wa.replace(/[^\d]/g, "").replace(/^00/, "").replace(/^0/, "218");

  return (
    <div className="space-y-2">
      {cleanWa && (
        <a
          href={`https://wa.me/${cleanWa}`}
          target="_blank"
          rel="noreferrer"
          className="
            inline-flex w-full items-center justify-center gap-1.5
            rounded-2xl bg-emerald-500 px-4 py-3
            text-sm font-black text-white
            shadow-md shadow-emerald-500/30
            transition active:scale-[0.98] hover:bg-emerald-600
          "
        >
          تواصل عبر واتساب
        </a>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onChat}
          disabled={chatLoading}
          className="btn-primary !py-2.5 !text-xs"
        >
          {chatLoading ? "..." : "مراسلة"}
        </button>
        {listing.phone && (
          <a
            href={`tel:${listing.phone}`}
            className="btn-secondary !py-2.5 !text-xs"
          >
            اتصال
          </a>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Backward-compat: ListingActionsBar import
 * - مذكور فوق
 * ============================================================ */
