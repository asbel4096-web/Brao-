"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Listing, TraderReview, UserProfile } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import {
  BadgeCheck,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { timeAgo, formatNumber, normalizeLibyanPhone } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTraderReview } from "@/hooks/useTraderReview";

const tabs = [
  { id: "listings", label: "السيارات" },
  { id: "about", label: "عن المعرض" },
  { id: "services", label: "خدماتنا" },
  { id: "reviews", label: "التقييمات" },
] as const;

type TraderTabId = (typeof tabs)[number]["id"];

interface TraderTabsProps {
  profile: UserProfile;
  listings: Listing[];
  services: Listing[];
  reviews: TraderReview[];
  averageRating: number;
  reviewsCount: number;
}

export function TraderTabs({
  profile,
  listings,
  services,
  reviews,
  averageRating,
  reviewsCount,
}: TraderTabsProps) {
  const [active, setActive] = useState<TraderTabId>("listings");

  // فلاتر للـlistings: نوع السيارة (الكل / فاخرة / SUV / ...)
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");

  // tabs تعرض بحث+فلاتر فقط لـ listings و services
  const showSearchBar = active === "listings" || active === "services";

  return (
    <section className="bg-white dark:bg-slate-950" dir="rtl">
      {/* ============================================================
          Tabs bar - sticky underline style
         ============================================================ */}
      <div className="
        sticky top-0 z-30 -mx-4 border-b border-slate-200
        bg-white/95 px-4 backdrop-blur
        dark:border-slate-800 dark:bg-slate-950/95
        sm:-mx-5 sm:px-5
      ">
        <div className="-mx-4 flex gap-0 overflow-x-auto no-scrollbar scroll-px-4 px-4 sm:-mx-5 sm:px-5">
          {tabs.map((tab) => {
            const label =
              tab.id === "about" && profile.isVerifiedDealer
                ? "عن المعرض"
                : tab.label;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`
                  relative shrink-0 whitespace-nowrap px-5 pb-3 pt-3
                  text-sm font-black transition
                  ${isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }
                `}
              >
                {label}
                {isActive && (
                  <motion.span
                    layoutId="tab-underline"
                    className="
                      absolute inset-x-3 -bottom-px h-0.5
                      rounded-full bg-blue-600 dark:bg-blue-400
                    "
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          Search + Filter row (only for listings/services)
         ============================================================ */}
      {showSearchBar && (
        <div className="px-4 pt-4 sm:px-5">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="
                  pointer-events-none absolute right-3 top-1/2
                  -translate-y-1/2 text-slate-400
                "
              />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="ابحث عن سيارة..."
                className="
                  h-11 w-full rounded-2xl border border-slate-200
                  bg-slate-50 pe-9 ps-3 text-sm text-slate-900
                  placeholder:text-slate-400
                  outline-none focus:border-blue-500/40
                  dark:border-slate-800 dark:bg-slate-900 dark:text-white
                "
              />
            </div>
            {/* Filter button */}
            <button
              type="button"
              className="
                inline-flex h-11 shrink-0 items-center gap-1.5
                rounded-2xl border border-slate-200 bg-white
                px-4 text-[12px] font-black text-slate-700
                transition hover:border-blue-500/40
                dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200
              "
            >
              <SlidersHorizontal size={13} />
              تصفية
            </button>
          </div>

          {/* Category chips */}
          {active === "listings" && (
            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
              {CATEGORY_CHIPS.map((c) => {
                const isActive = filterCat === c.id;
                return (
                  <motion.button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCat(c.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      shrink-0 whitespace-nowrap rounded-full px-4 py-2
                      text-[12px] font-black transition
                      ${isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      }
                    `}
                  >
                    {c.label}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          Content
         ============================================================ */}
      <div className="p-4 sm:p-5">
        {(() => {
          switch (active) {
            case "listings":
              return (
                <CardsGrid
                  items={filterItems(listings, filterCat, searchQ)}
                  emptyLabel="لا توجد إعلانات منشورة حالياً."
                />
              );
            case "services":
              return (
                <CardsGrid
                  items={filterItems(services, "all", searchQ)}
                  emptyLabel="لا توجد خدمات منشورة حالياً."
                />
              );
            case "reviews":
              return (
                <ReviewsTab
                  traderUid={profile.uid}
                  reviews={reviews}
                  averageRating={averageRating}
                  reviewsCount={reviewsCount}
                />
              );
            case "about":
              return (
                <AboutTrader
                  profile={profile}
                  listingsCount={listings.length}
                  servicesCount={services.length}
                  reviewsCount={reviewsCount}
                />
              );
            default:
              return null;
          }
        })()}
      </div>
    </section>
  );
}

// ============================================================
// Category chips for filter
// ============================================================
const CATEGORY_CHIPS = [
  { id: "all", label: "الكل" },
  { id: "luxury", label: "فاخرة" },
  { id: "pickup", label: "بيك أب" },
  { id: "sport", label: "رياضية" },
  { id: "suv", label: "SUV" },
  { id: "sedan", label: "سيدان" },
];

/** فلتر client-side للإعلانات حسب الفئة + البحث. */
function filterItems(items: Listing[], cat: string, q: string): Listing[] {
  let out = items;
  if (cat && cat !== "all") {
    out = out.filter((item: any) => {
      const c = (item.category || item.bodyType || "").toLowerCase();
      // مطابقات تقريبية (يمكن توسيعها)
      if (cat === "luxury") return /luxury|فاخر/.test(c);
      if (cat === "pickup") return /pickup|بيك|truck/.test(c);
      if (cat === "sport") return /sport|رياض/.test(c);
      if (cat === "suv") return /suv|دفع/.test(c);
      if (cat === "sedan") return /sedan|سيدان/.test(c);
      return true;
    });
  }
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    out = out.filter((item: any) => {
      return (
        (item.title || "").toLowerCase().includes(needle) ||
        (item.make || "").toLowerCase().includes(needle) ||
        (item.model || "").toLowerCase().includes(needle)
      );
    });
  }
  return out;
}

function CardsGrid({ items, emptyLabel }: { items: Listing[]; emptyLabel: string }) {
  if (!items.length) {
    return (
      <div className="
        rounded-3xl border border-dashed border-slate-200
        bg-slate-50 p-10 text-center
        dark:border-slate-800 dark:bg-slate-900/40
      ">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
        >
          <ListingCard listing={item} priority={index < 2} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function ReviewsTab({
  traderUid,
  reviews,
  averageRating,
  reviewsCount,
}: {
  traderUid: string;
  reviews: TraderReview[];
  averageRating: number;
  reviewsCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="text-3xl font-black text-slate-950 dark:text-white">
          {Number(averageRating || 0).toFixed(1)}
        </div>
        <div className="flex flex-col">
          <StarRow value={Math.round(averageRating)} />
          <span className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {reviewsCount > 0
              ? `${formatNumber(reviewsCount)} تقييم`
              : "لا توجد تقييمات حالياً."}
          </span>
        </div>
      </div>

      <ReviewForm traderUid={traderUid} />

      <ReviewsList items={reviews} />
    </div>
  );
}

function ReviewForm({ traderUid }: { traderUid: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const { myReview, isOwnProfile, canReview, submitReview, removeReview } =
    useTraderReview(traderUid);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  // Show the user's existing review values unless they are actively editing.
  const effectiveRating = editing ? rating : myReview?.rating ?? rating;
  const effectiveComment = editing ? comment : myReview?.comment ?? comment;

  if (isOwnProfile) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">
        لا يمكنك تقييم حسابك.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">
        سجّل الدخول لتتمكن من تقييم التاجر.
      </div>
    );
  }

  // Existing review, not in edit mode -> summary + edit/delete actions.
  if (myReview && !editing) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-950 dark:text-white">تقييمك</div>
            <div className="mt-1">
              <StarRow value={myReview.rating} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary !min-h-[36px] !px-3 !py-1.5 !text-xs"
              onClick={() => {
                setRating(myReview.rating);
                setComment(myReview.comment || "");
                setEditing(true);
              }}
            >
              تعديل
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-secondary !min-h-[36px] !px-3 !py-1.5 !text-xs"
              onClick={async () => {
                setBusy(true);
                try {
                  await removeReview();
                  toast.success("تم حذف تقييمك.");
                } catch (err: any) {
                  toast.error(err?.message || "تعذّر حذف التقييم.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              حذف
            </button>
          </div>
        </div>
        {myReview.comment ? (
          <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
            {myReview.comment}
          </p>
        ) : null}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!canReview) return;
    if (!(effectiveRating >= 1 && effectiveRating <= 5)) {
      toast.error("اختر تقييماً من 1 إلى 5 نجوم.");
      return;
    }
    setBusy(true);
    try {
      await submitReview(effectiveRating, effectiveComment);
      toast.success(myReview ? "تم تحديث تقييمك." : "تم إضافة تقييمك.");
      setEditing(false);
      setRating(0);
      setComment("");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر حفظ التقييم.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-black text-slate-950 dark:text-white">
        {myReview ? "تعديل تقييمك" : "أضف تقييمك"}
      </div>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} نجوم`}
            onClick={() => {
              setRating(n);
              setEditing(true);
            }}
            className="p-0.5"
          >
            <Star
              size={26}
              className={
                n <= effectiveRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-600"
              }
            />
          </button>
        ))}
      </div>

      <textarea
        value={effectiveComment}
        onChange={(e) => {
          setComment(e.target.value);
          setEditing(true);
        }}
        rows={3}
        maxLength={500}
        placeholder="اكتب تعليقك عن التاجر (اختياري)"
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSubmit()}
          className="btn-primary !min-h-[40px] !px-4 !py-2 !text-sm"
        >
          {busy ? "جارٍ الحفظ..." : myReview ? "حفظ التعديل" : "إرسال التقييم"}
        </button>
        {myReview && editing ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setRating(0);
              setComment("");
            }}
            className="btn-secondary !min-h-[40px] !px-4 !py-2 !text-sm"
          >
            إلغاء
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={
            n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
          }
        />
      ))}
    </div>
  );
}

function ReviewsList({ items }: { items: TraderReview[] }) {
  if (!items.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">لا توجد تقييمات حالياً.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((review) => (
        <div key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">{review.reviewerName || "مستخدم"}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeAgo(review.updatedAt || review.createdAt)}</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Star size={12} className="fill-current" />
              {review.rating}/5
            </div>
          </div>
          {review.comment ? <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">{review.comment}</p> : null}
        </div>
      ))}
    </div>
  );
}

function AboutTrader({
  profile,
  listingsCount,
  servicesCount,
  reviewsCount,
}: {
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  reviewsCount: number;
}) {
  // ============================================================
  // النسخة الموثَّقة: 3 بطاقات مخصّصة + بيانات عامة.
  // ============================================================
  if (profile.isVerifiedDealer) {
    return (
      <DealerAbout
        profile={profile}
        listingsCount={listingsCount}
        servicesCount={servicesCount}
        reviewsCount={reviewsCount}
      />
    );
  }

  // ============================================================
  // النسخة الافتراضية - مستخدم عادي (غير موثَّق).
  // ============================================================
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="text-base font-black text-slate-950 dark:text-white">نبذة</h3>
        <p className="mt-3 text-sm leading-8 text-slate-600 dark:text-slate-200">{profile.bio || "هذا التاجر يعرض منتجاته وخدماته داخل براتشو كار مع واجهة احترافية وسريعة."}</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="text-base font-black text-slate-950 dark:text-white">بيانات عامة</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AboutItem label="المدينة" value={profile.city || "غير مذكور"} />
          <AboutItem label="رقم الهاتف" value={profile.phone || "غير مذكور"} />
          <AboutItem label="عدد الإعلانات" value={formatNumber(listingsCount)} />
          <AboutItem label="عدد الخدمات" value={formatNumber(servicesCount)} />
          <AboutItem label="عدد التقييمات" value={formatNumber(reviewsCount)} />
          <AboutItem label="المتابعين" value={formatNumber(profile.followersCount || 0)} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * DealerAbout - تبويب "حول المعرض" للمعارض الموثقة.
 * ============================================================ */
function DealerAbout({
  profile,
  listingsCount,
  servicesCount,
  reviewsCount,
}: {
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  reviewsCount: number;
}) {
  const bio = profile.dealerBio?.trim() || profile.bio?.trim();
  const wa = normalizeLibyanPhone(profile.phone || profile.whatsapp || "");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ===================== نبذة عن المعرض ===================== */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
          <BadgeCheck size={18} className="text-brand-700 dark:text-brand-300" />
          نبذة عن المعرض
        </h3>
        {bio ? (
          <p className="mt-3 text-sm leading-8 text-slate-600 dark:text-slate-200">
            {bio}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            لم يقم المعرض بإضافة نبذة بعد.
          </p>
        )}
        {/* خط فاصل + بيانات سريعة أسفل النبذة */}
        <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
          <AboutItem label="المدينة" value={profile.city || "غير مذكور"} />
          <AboutItem
            label="حالة المعرض"
            value={profile.isVerifiedDealer ? "موثَّق" : "—"}
          />
          <AboutItem label="عدد الإعلانات" value={formatNumber(listingsCount)} />
          <AboutItem label="عدد الخدمات" value={formatNumber(servicesCount)} />
          <AboutItem label="عدد التقييمات" value={formatNumber(reviewsCount)} />
          <AboutItem
            label="المتابعين"
            value={formatNumber(profile.followersCount || 0)}
          />
        </div>
      </div>

      {/* ===================== ساعات العمل + التواصل (عمود ثاني) ===================== */}
      <div className="space-y-4">
        {/* ساعات العمل */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <h3 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
            <Clock3 size={18} className="text-brand-700 dark:text-brand-300" />
            ساعات العمل
          </h3>
          <WorkingHoursList workingHours={profile.workingHours} />
        </div>

        {/* معلومات التواصل */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <h3 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
            <Phone size={18} className="text-brand-700 dark:text-brand-300" />
            معلومات التواصل
          </h3>
          <div className="mt-4 space-y-2">
            {profile.phone ? (
              <ContactRow
                icon={<Phone size={16} />}
                label="اتصال"
                value={profile.phone}
                href={`tel:${profile.phone}`}
                dir="ltr"
              />
            ) : null}
            {wa ? (
              <ContactRow
                icon={<MessageCircle size={16} />}
                label="واتساب"
                value={wa}
                href={`https://wa.me/${wa}`}
                external
                dir="ltr"
              />
            ) : null}
            {profile.locationUrl ? (
              <ContactRow
                icon={<MapPin size={16} />}
                label="الموقع على الخريطة"
                value="فتح الخرائط"
                href={profile.locationUrl}
                external
              />
            ) : null}
            {!profile.phone && !wa && !profile.locationUrl ? (
              <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                لم يتم إضافة بيانات تواصل بعد.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const DAY_LABELS: Record<string, string> = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الإثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
};
const DAY_ORDER: Array<keyof NonNullable<UserProfile["workingHours"]>> = [
  "sat",
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];

function WorkingHoursList({
  workingHours,
}: {
  workingHours?: UserProfile["workingHours"];
}) {
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return (
      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
        لم يتم تحديد ساعات العمل.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-1.5">
      {DAY_ORDER.map((day) => {
        const v = workingHours[day];
        if (!v) return null;
        const isClosed = v === "closed";
        const label = DAY_LABELS[day];
        return (
          <li
            key={day}
            className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2 text-sm dark:bg-slate-900"
          >
            <span className="font-black text-slate-700 dark:text-slate-200">
              {label}
            </span>
            {isClosed ? (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                مغلق
              </span>
            ) : (
              <span
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
                dir="ltr"
              >
                {v.open} – {v.close}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="
        group flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5
        transition hover:bg-brand-50/60
        dark:bg-slate-900 dark:hover:bg-slate-800
      "
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div
          className="truncate text-sm font-black text-slate-900 dark:text-white"
          dir={dir}
        >
          {value}
        </div>
      </div>
      {external ? (
        <ExternalLink
          size={14}
          className="shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-300"
        />
      ) : null}
    </a>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-slate-900">
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-black text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
