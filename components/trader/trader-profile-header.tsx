"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { MapPin, Phone, MessageCircle, Star, UserPlus, UserCheck, Clock3, FileText, BriefcaseBusiness } from "lucide-react";
import { getTraderDisplayName, normalizeLibyanPhone, formatNumber } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { useFollowTraderState } from "@/hooks/useListingEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useState } from "react";

interface TraderProfileHeaderProps {
  traderId: string;
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  onMessage: () => Promise<void> | void;
}

export function TraderProfileHeader({
  traderId,
  profile,
  listingsCount,
  servicesCount,
  onMessage,
}: TraderProfileHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { isFollowing, toggleFollow, isOwnProfile } = useFollowTraderState(traderId);
  const [busy, setBusy] = useState(false);
  const displayName = getTraderDisplayName(profile);
  const phone = profile.phone || "";
  const wa = normalizeLibyanPhone(phone);

  const handleFollow = async () => {
    if (!user) {
      toast.info("سجّل الدخول أولاً لمتابعة التاجر.");
      router.push(`/login?redirect=/traders/${traderId}`);
      return;
    }

    if (busy) return;
    setBusy(true);
    try {
      await toggleFollow();
      toast.success(isFollowing ? "تم إلغاء متابعة التاجر." : "تمت متابعة التاجر.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحديث المتابعة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="h-24 bg-gradient-to-l from-brand-700 via-brand-600 to-action-500" />
      <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-xl dark:border-slate-900 dark:bg-slate-900">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={displayName} fill className="object-cover" sizes="96px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-700 text-3xl font-black text-white">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                  {displayName}
                </h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${profile.isOnline ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  <Clock3 size={12} />
                  {profile.isOnline ? "نشط الآن" : "نشاط عادي"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
                {profile.city ? (
                  <span className="inline-flex items-center gap-1"><MapPin size={14} />{profile.city}</span>
                ) : null}
                <span className="inline-flex items-center gap-1"><Star size={14} className="text-amber-500" />{Number(profile.averageRating || 0).toFixed(1)} متوسط التقييم</span>
              </div>

              {profile.bio ? (
                <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-200">{profile.bio}</p>
              ) : (
                <p className="max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">تاجر في براتشو كار يعرض سيارات وخدماته بشكل احترافي داخل المنصة.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isOwnProfile ? (
              <button type="button" onClick={() => void handleFollow()} className={isFollowing ? "btn-secondary" : "btn-primary"}>
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {isFollowing ? "إلغاء المتابعة" : "متابعة"}
              </button>
            ) : null}
            <button type="button" onClick={() => void onMessage()} className="btn-action">
              <MessageCircle size={16} />
              مراسلة
            </button>
            {phone ? (
              <a href={`tel:${phone}`} className="btn-secondary">
                <Phone size={16} />
                اتصال
              </a>
            ) : null}
            {wa ? (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-secondary">
                <MessageCircle size={16} />
                واتساب
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<FileText size={18} />} label="الإعلانات" value={formatNumber(listingsCount)} />
          <StatCard icon={<BriefcaseBusiness size={18} />} label="الخدمات" value={formatNumber(servicesCount)} />
          <StatCard icon={<UserPlus size={18} />} label="المتابعين" value={formatNumber(profile.followersCount || 0)} />
          <StatCard icon={<Star size={18} />} label="التقييم" value={Number(profile.averageRating || 0).toFixed(1)} />
          <StatCard icon={<Clock3 size={18} />} label="الحالة" value={profile.isOnline ? "نشط" : "متصل لاحقاً"} />
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">{icon}<span className="text-xs font-bold">{label}</span></div>
      <div className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
