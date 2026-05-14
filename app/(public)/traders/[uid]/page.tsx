"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTraderProfile } from "@/hooks/useTraderProfile";
import { buildChatId, getTraderDisplayName } from "@/lib/utils";
import { TraderProfileHeader } from "@/components/trader/trader-profile-header";
import { TraderTabs } from "@/components/trader/trader-tabs";

export default function TraderPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();
  const {
    profile: trader,
    listings,
    services,
    reviews,
    averageRating,
    reviewsCount,
    loading,
    missing,
  } = useTraderProfile(params.uid);

  const handleMessage = async () => {
    if (!trader) return;

    if (!user) {
      router.push(`/login?redirect=/traders/${params.uid}`);
      return;
    }

    if (!listings.length && !services.length) {
      toast.info("لا يوجد إعلان أو خدمة جاهزة لبدء محادثة مرتبطة بها، لكن سيتم فتح محادثة عامة مع التاجر.");
    }

    const anchorItem = listings[0] || services[0];
    const listingId = anchorItem?.id || `trader_${trader.uid}`;
    const listingTitle = anchorItem?.title || `محادثة مع ${getTraderDisplayName(trader)}`;
    const listingImage = anchorItem?.images?.[0] || trader.photoURL || "";

    const chatId = buildChatId(user.uid, trader.uid, listingId);
    const chatRef = doc(db, "chats", chatId);
    const existing = await getDoc(chatRef);

    if (!existing.exists()) {
      await setDoc(chatRef, {
        listingId,
        listingTitle,
        listingImage,
        participants: [user.uid, trader.uid].sort(),
        participantsInfo: {
          [user.uid]: {
            name: profile?.businessName || profile?.name || user.displayName || user.email || user.phoneNumber || "مستخدم",
            photoURL: profile?.photoURL || user.photoURL || "",
          },
          [trader.uid]: {
            name: getTraderDisplayName(trader),
            photoURL: trader.photoURL || "",
          },
        },
        unreadCount: { [user.uid]: 0, [trader.uid]: 0 },
        createdAt: serverTimestamp(),
      });
    }

    router.push(`/messages/${chatId}`);
  };

  if (loading) {
    return (
      <section className="container py-6 sm:py-8">
        <div className="space-y-6">
          <div className="skeleton h-64 w-full rounded-[32px]" />
          <div className="skeleton h-96 w-full rounded-[32px]" />
        </div>
      </section>
    );
  }

  if (missing || !trader) {
    return (
      <section className="container py-16 sm:py-24">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            لم يتم العثور على التاجر
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            قد يكون الحساب غير موجود أو تم حذفه.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            العودة للرئيسية
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="space-y-4 sm:space-y-6">
        <TraderProfileHeader
          traderId={trader.uid}
          profile={trader}
          listingsCount={listings.length}
          servicesCount={services.length}
          averageRating={averageRating}
          reviewsCount={reviewsCount}
          onMessage={handleMessage}
        />
        <TraderTabs
          profile={trader}
          listings={listings}
          services={services}
          reviews={reviews}
          averageRating={averageRating}
          reviewsCount={reviewsCount}
        />
      </div>
    </section>
  );
}
