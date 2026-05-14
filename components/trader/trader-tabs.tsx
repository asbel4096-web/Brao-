"use client";

import { useMemo, useState } from "react";
import type { Listing, TraderReview, UserProfile } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { Star } from "lucide-react";
import { timeAgo, formatNumber } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTraderReview } from "@/hooks/useTraderReview";

const tabs = [
  { id: "listings", label: "الإعلانات" },
  { id: "services", label: "الخدمات" },
  { id: "reviews", label: "التقييمات" },
  { id: "about", label: "حول التاجر" },
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

  const content = useMemo(() => {
    switch (active) {
      case "listings":
        return <CardsGrid items={listings} emptyLabel="لا توجد إعلانات منشورة حالياً." />;
      case "services":
        return <CardsGrid items={services} emptyLabel="لا توجد خدمات منشورة حالياً." />;
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
  }, [active, averageRating, listings, profile, reviews, reviewsCount, services]);

  return (
    <section className="card p-4 sm:p-6">
      {/*
        Tabs row: horizontally scrollable on mobile without clipping.
        - Negative margin + matching padding lets the scroll area reach the
          card edges, so the last tab ("حول التاجر") is never cut off.
        - scroll-px keeps a small inset when scrolled to either end.
      */}
      <div className="-mx-4 sm:-mx-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-px-4 px-4 sm:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black transition ${active === tab.id ? "bg-brand-700 text-white shadow-blue" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">{content}</div>
    </section>
  );
}

function CardsGrid({ items, emptyLabel }: { items: Listing[]; emptyLabel: string }) {
  if (!items.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">{emptyLabel}</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <ListingCard key={item.id} listing={item} priority={index < 2} />
      ))}
    </div>
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

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-slate-900">
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-black text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
