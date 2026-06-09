"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  User as UserIcon,
  Star,
  ScrollText,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { trackEvent } from "@/lib/track-event";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { formatPrice, normalizeLibyanPhone, buildChatId, getTraderDisplayName } from "@/lib/utils";
import dynamic from "next/dynamic";
import ListingComments from "@/components/listing-comments";
import { ImageGallery } from "@/components/image-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportButton } from "@/components/report/report-button";
import { ListingQualityCard } from "@/components/listing-quality-card";
import { OwnerStatsBar } from "@/components/owner-stats-bar";

// Lazy load: تحت الطيّ، لا حاجة لها في initial paint
const SafetyTipsCard = dynamic(
  () => import("@/components/safety-tips-card").then((m) => m.SafetyTipsCard),
  { ssr: true, loading: () => null }
);
import type { Listing, UserProfile } from "@/lib/types";
import { ListingActionsBar } from "@/components/listing-actions-bar";

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

        // تسجيل المشاهدة عبر الـAPI الآمن (يستبعد المالك + يمنع التكرار).
        // لا نكتب views من العميل مباشرة (منعاً للتلاعب).
        trackEvent(data.id, "view");

        try {
          const sellerSnap = await getDoc(doc(db, "users", data.ownerId));
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data() as UserProfile;
            setSeller({
              ...sellerData,
              uid: sellerSnap.id,
            });
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

  if (loading) {
    return (
      <section className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="skeleton h-48" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-32" />
            <div className="skeleton h-48" />
          </div>
        </div>
      </section>
    );
  }

  if (missing || !listing) return notFound();

  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");

  return (
    <section className="container py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="relative">
            <ImageGallery images={listing.images || []} alt={listing.title} />
            <div className="absolute left-4 top-4 z-10 flex gap-2">
              <FavoriteButton listing={listing} variant="icon" />
              <ShareButton title={listing.title} text={listing.city} variant="icon" />
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{listing.category}</span>
              {listing.featured && <span className="badge-action">مميز</span>}
              {listing.status === "approved" && <span className="badge-status-approved">معتمد</span>}
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                  {listing.title}
                </h1>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin size={15} />
                  <span>
                    {listing.city}
                    {listing.address ? ` - ${listing.address}` : ""}
                  </span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-xs text-slate-500 dark:text-slate-400">السعر</div>
                <div className="text-2xl font-black text-brand-700 dark:text-brand-300 sm:text-3xl">
                  {formatPrice(listing.price)}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-4">
              <Spec icon={Calendar} label="السنة" value={listing.year ?? "-"} />
              <Spec
                icon={Gauge}
                label="العداد"
                value={listing.mileage ? `${Number(listing.mileage).toLocaleString("ar-LY")} كم` : "-"}
              />
              <Spec icon={Fuel} label="الوقود" value={listing.fuel ?? "-"} />
              <Spec icon={Settings} label="الناقل" value={listing.transmission ?? "-"} />
            </div>

            {(listing.brand || listing.model || listing.color || listing.engine) && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {listing.brand && <Spec label="الماركة" value={listing.brand} />}
                {listing.model && <Spec label="الموديل" value={listing.model} />}
                {listing.color && <Spec label="اللون" value={listing.color} />}
                {listing.engine && <Spec label="المحرك" value={listing.engine} />}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="mb-3 text-base font-black dark:text-white">الوصف</h3>
              <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-200">
                {listing.description}
              </p>
            </div>

            {(listing.features?.length || listing.defects?.length) && (
              <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2">
                {listing.features?.length ? (
                  <div>
                    <h4 className="mb-3 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      المميزات
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {listing.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {listing.defects?.length ? (
                  <div>
                    <h4 className="mb-3 text-sm font-black text-rose-700 dark:text-rose-300">
                      عيوب وملاحظات
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {listing.defects.map((defect) => (
                        <li key={defect} className="flex items-center gap-2 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                          {defect}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <ListingActionsBar
                listing={listing}
                commentsCount={Number(listing.commentsCount || 0)}
              />
            </div>
          </div>

          <OwnerStatsBar
            listingId={listing.id}
            ownerId={listing.ownerId}
            initialViews={listing.views}
            variant="compact"
          />

          <ListingQualityCard listing={listing} />

          {(listing.address || listing.mapLink) && (
            <div className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-brand-700 dark:text-brand-300" />
                <h3 className="text-base font-black dark:text-white">الموقع</h3>
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
                  فتح الخريطة
                </a>
              ) : null}
            </div>
          )}

          <div id="comments" className="scroll-mt-24">
            <ListingComments
              listingId={listing.id}
              commentsEnabled={listing.commentsEnabled !== false}
              ownerId={listing.ownerId}
            />
          </div>

          <SafetyTipsCard />

          {/* زر الإبلاغ على الإعلان - يخفي نفسه لصاحب الإعلان */}
          <div className="flex justify-center">
            <ReportButton
              targetType="listing"
              targetId={listing.id}
              targetMeta={{
                title: listing.title,
                ownerId: listing.ownerId,
              }}
              variant="text"
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-brand-700 dark:text-brand-300" />
              <h2 className="text-lg font-black dark:text-white">التاجر</h2>
            </div>

            <Link
              href={`/traders/${listing.ownerId}`}
              className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-950/40"
            >
              {seller?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seller.photoURL}
                  alt={sellerName}
                  className="h-16 w-16 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-xl font-black text-white">
                  {sellerName.charAt(0)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-slate-950 dark:text-white">
                  {sellerName}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {seller?.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {seller.city}
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="text-amber-500" />
                    {Number(seller?.averageRating || 0).toFixed(1)}
                  </span>
                </div>

                <div className="mt-2 text-sm text-brand-700 dark:text-brand-300">
                  عرض صفحة التاجر
                </div>
              </div>
            </Link>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void startChat()}
                className="btn-action"
                disabled={chatLoading}
              >
                <MessageCircle size={16} />
                {chatLoading ? "جارٍ الفتح..." : "مراسلة"}
              </button>

              <a href={listing.phone ? `tel:${listing.phone}` : "#"} className="btn-secondary">
                <Phone size={16} />
                اتصال
              </a>

              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary col-span-2"
                >
                  <MessageCircle size={16} />
                  واتساب
                </a>
              ) : null}
            </div>

            <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/40">
              <MetaRow
                icon={ShieldCheck}
                label="الحالة"
                value={listing.status === "approved" ? "موثّق داخل المنصة" : "قيد المراجعة"}
              />
              <MetaRow
                icon={ScrollText}
                label="التعليقات"
                value={listing.commentsEnabled === false ? "مغلقة" : "مفتوحة"}
              />
              <MetaRow icon={MapPin} label="المدينة" value={listing.city || "-"} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/40">
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        {Icon ? <Icon size={16} className="text-brand-700 dark:text-brand-300" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <div className="font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
