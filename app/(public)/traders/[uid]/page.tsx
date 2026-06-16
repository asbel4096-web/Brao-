"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTraderProfile } from "@/hooks/useTraderProfile";
import { buildChatId, getTraderDisplayName } from "@/lib/utils";
import { TraderProfileHeader } from "@/components/trader/trader-profile-header";
import { TraderTabs } from "@/components/trader/trader-tabs";
import { StoryViewer } from "@/components/trader/story-viewer";
import { useStoriesByCategory } from "@/hooks/dealer/use-dealer-stories";
import type { StoryCategory } from "@/lib/dealer/stories";

export default function TraderPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();
  const [openStoryCat, setOpenStoryCat] = useState<StoryCategory | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

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

  // Stories للتصنيف المفتوح حالياً
  const storiesByCategory = useStoriesByCategory(
    params.uid,
    openStoryCat || undefined
  );

  const handleMessage = async () => {
    if (!trader) return;

    if (!user) {
      router.push(`/login?redirect=/traders/${params.uid}`);
      return;
    }

    // لا يمكن للتاجر مراسلة نفسه
    if (trader.uid === user.uid) {
      toast.warning("لا يمكنك بدء محادثة مع نفسك.");
      return;
    }

    if (chatBusy) return;
    setChatBusy(true);

    try {
      if (!listings.length && !services.length) {
        toast.info("لا يوجد إعلان أو خدمة مرتبطة، لكن سيتم فتح محادثة عامة مع التاجر.");
      }

      const anchorItem = listings[0] || services[0];
      const listingId = anchorItem?.id || `trader_${trader.uid}`;
      const listingTitle = anchorItem?.title || `محادثة مع ${getTraderDisplayName(trader)}`;
      const listingImage = anchorItem?.images?.[0] || trader.photoURL || "";

      const chatId = buildChatId(user.uid, trader.uid, listingId);
      const chatRef = doc(db, "chats", chatId);

      // لا نقرأ المحادثة قبل إنشائها: قراءة مستند غير موجود تُرفض بقاعدة
      // المشاركين (resource=null) → "Missing or insufficient permissions".
      // بدلاً من ذلك نكتب بـ merge: ينشئها إن لم تكن موجودة، ولا يكتب فوق
      // محادثة قائمة (لا نضمّن createdAt/unreadCount حتى لا نُصفّر العدّادات).
      await setDoc(
        chatRef,
        {
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
        },
        { merge: true }
      );

      router.push(`/messages/${chatId}`);
    } catch (err: any) {
      // بدون هذا الـcatch كان الزر «لا يفعل شيئاً» عند فشل الصلاحيات
      toast.error(err?.message || "تعذّر فتح المحادثة. حاول مجدداً.");
    } finally {
      setChatBusy(false);
    }
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
    <>
      {/* Full-bleed (no container) لأن الـheader يحوي cover كامل العرض */}
      <section className="-mx-4 sm:-mx-0">
        <div className="mx-auto max-w-3xl pb-28 sm:pb-32">
          <TraderProfileHeader
            traderId={trader.uid}
            profile={trader}
            listingsCount={listings.length}
            servicesCount={services.length}
            averageRating={averageRating}
            reviewsCount={reviewsCount}
            onMessage={handleMessage}
            onStoryOpen={(cat) => setOpenStoryCat(cat)}
            onAddStory={() => router.push("/profile/edit?tab=stories")}
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

      {/* Story viewer */}
      {openStoryCat && storiesByCategory.stories.length > 0 && (
        <StoryViewer
          open={!!openStoryCat}
          onClose={() => setOpenStoryCat(null)}
          stories={storiesByCategory.stories}
          category={openStoryCat}
          dealerName={getTraderDisplayName(trader)}
          dealerLogo={trader.dealerLogo || trader.photoURL}
        />
      )}
    </>
  );
}
