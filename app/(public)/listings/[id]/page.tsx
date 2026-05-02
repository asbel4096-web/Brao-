"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, increment, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import {
  MapPin, MessageCircle, Phone, ShieldCheck, Calendar, Gauge, Fuel, Settings, User as UserIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, normalizeLibyanPhone, buildChatId } from "@/lib/utils";
import ListingComments from "@/components/listing-comments";
import { ImageGallery } from "@/components/image-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { SafetyTipsCard } from "@/components/safety-tips-card";
import { ListingQualityCard } from "@/components/listing-quality-card";
import type { Listing } from "@/lib/types";

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
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
        const data = { id: snap.id, ...(snap.data() as any) } as Listing;
        setListing(data);
        setLoading(false);
        // increment views (silent)
        try {
          await updateDoc(ref, { views: increment(1) });
        } catch {/* ok */}
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("load listing", err);
        setMissing(true);
        setLoading(false);
      }
    };
    if (params.id) void load();
  }, [params.id]);

  const startChat = async () => {
    if (!user) {
      router.push(`/login?redirect=/listings/${params.id}`);
      return;
    }
    if (!listing) return;
    if (listing.ownerId === user.uid) {
      alert("لا يمكنك بدء دردشة مع إعلانك الخاص.");
      return;
    }
    setChatLoading(true);
    try {
      const chatId = buildChatId(user.uid, listing.ownerId, listing.id);
      const chatRef = doc(db, "chats", chatId);
      const existing = await getDoc(chatRef);

      if (!existing.exists()) {
        const sellerSnap = await getDoc(doc(db, "users", listing.ownerId));
        const sellerData = sellerSnap.data() as any;

        await setDoc(chatRef, {
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.images?.[0] || "",
          participants: [user.uid, listing.ownerId].sort(),
          participantsInfo: {
            [user.uid]: {
              name: profile?.name || user.displayName || user.email || user.phoneNumber || "مستخدم",
              photoURL: profile?.photoURL || user.photoURL || "",
            },
            [listing.ownerId]: {
              name: sellerData?.name || listing.sellerName || "البائع",
              photoURL: sellerData?.photoURL || "",
            },
          },
          unreadCount: { [user.uid]: 0, [listing.ownerId]: 0 },
          createdAt: serverTimestamp(),
        });
      }
      router.push(`/messages/${chatId}`);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("start chat", err);
      alert(err?.message || "تعذّر فتح الدردشة.");
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
        {/* العمود الرئيسي */}
        <div className="space-y-6">
          {/* المعرض - مع زر مفضلة عائم في الأعلى يساراً */}
          <div className="relative">
            <ImageGallery images={listing.images || []} alt={listing.title} />
            <div className="absolute left-4 top-4 z-10">
              <FavoriteButton listing={listing} variant="icon" />
            </div>
          </div>

          {/* بطاقة العنوان والمواصفات */}
          <div className="card p-5 sm:p-6">
            {/* الشارات والوقت */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{listing.category}</span>
              {listing.featured && <span className="badge-action">مميز</span>}
              {listing.status === "approved" && (
                <span className="badge-status-approved">معتمد</span>
              )}
            </div>

            {/* العنوان والسعر */}
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

            {/* المواصفات الأساسية */}
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

            {/* مواصفات إضافية */}
            {(listing.brand || listing.model || listing.color || listing.engine) && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {listing.brand && <Spec label="الماركة" value={listing.brand} />}
                {listing.model && <Spec label="الموديل" value={listing.model} />}
                {listing.color && <Spec label="اللون" value={listing.color} />}
                {listing.engine && <Spec label="المحرك" value={listing.engine} />}
              </div>
            )}

            {/* الوصف */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="mb-3 text-base font-black dark:text-white">الوصف</h3>
              <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-200">
                {listing.description}
              </p>
            </div>

            {/* المميزات والعيوب */}
            {(listing.features?.length || listing.defects?.length) ? (
              <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2">
                {listing.features?.length ? (
                  <div>
                    <h4 className="mb-3 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      المميزات
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {listing.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          {f}
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
                      {listing.defects.map((d) => (
                        <li key={d} className="flex items-center gap-2 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* مؤشرات الجودة */}
          <ListingQualityCard listing={listing} />

          {/* الموقع */}
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
              {listing.mapLink && (
                <a
                  href={listing.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-3"
                >
                  فتح في الخرائط
                </a>
              )}
            </div>
          )}

          {/* بطاقة نصائح السلامة - تحت قسم البائع/التفاصيل كما طُلب */}
          <SafetyTipsCard />

          {/* التعليقات */}
          <ListingComments listingId={listing.id} />
        </div>

        {/* العمود الجانبي */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* بطاقة التواصل */}
          <div className="card p-5 sm:p-6">
            <div className="text-sm text-slate-500 dark:text-slate-300">السعر</div>
            <div className="mt-1 text-3xl font-black text-brand-700 dark:text-brand-300 sm:text-4xl">
              {formatPrice(listing.price)}
            </div>

            <div className="mt-5 grid gap-2.5">
              <a
                href={listing.phone ? `tel:${listing.phone}` : "#"}
                className="btn-primary w-full"
              >
                <Phone size={18} /> اتصال مباشر
              </a>
              <a
                href={wa ? `https://wa.me/${wa}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="btn-action w-full"
              >
                <MessageCircle size={18} /> واتساب
              </a>
              {user?.uid !== listing.ownerId && (
                <button
                  type="button"
                  onClick={startChat}
                  disabled={chatLoading}
                  className="btn-secondary w-full"
                >
                  {chatLoading ? "جارٍ الفتح..." : "ابدأ دردشة داخلية"}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <FavoriteButton listing={listing} variant="button" />
                <ShareButton title={listing.title} text={listing.description?.slice(0, 100)} />
              </div>
            </div>
          </div>

          {/* بطاقة البائع */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <ShieldCheck size={18} />
              <span className="font-black">معلومات البائع</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <UserIcon size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-black dark:text-white">
                  {listing.sellerName}
                </div>
                <div className="text-xs text-slate-500">{listing.city}</div>
              </div>
            </div>
            <Link
              href={`/listings?q=${encodeURIComponent(listing.sellerName)}`}
              className="btn-ghost mt-3 w-full justify-center"
            >
              كل إعلانات البائع
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Spec({ icon: Icon, label, value }: { icon?: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
