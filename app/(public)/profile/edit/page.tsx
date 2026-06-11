"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  ChevronRight,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isVerifiedNow } from "@/lib/wallet/verification";
import { InfoEditTab } from "@/components/dealer-edit/info-edit-tab";
import { ImageEditTab } from "@/components/dealer-edit/image-edit-tab";
import { GalleryEditTab } from "@/components/dealer-edit/gallery-edit-tab";
import { StoriesEditTab } from "@/components/dealer-edit/stories-edit-tab";

/**
 * صفحة تحرير معلومات المعرض - /profile/edit
 *
 * Tabs:
 *  - info: المعلومات (اسم/موقع/هاتف/bio)
 *  - logo: صورة الـlogo
 *  - cover: صورة الغلاف
 *  - gallery: معرض صور (حتى 12)
 *  - stories: إنشاء وإدارة Stories
 *
 * يدعم ?tab=stories في الـURL للقفز المباشر.
 *
 * ⚠️ ملاحظة: useSearchParams() في Next.js 14 يتطلب لفّ المكوّن
 * في <Suspense> عند الـbuild، وإلا يفشل prerender.
 */

type TabKey = "info" | "logo" | "cover" | "gallery" | "stories";

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: any;
  desc: string;
}> = [
  { key: "info", label: "معلومات المعرض", icon: Building2, desc: "الاسم، الموقع، الهاتف" },
  { key: "logo", label: "اللوجو", icon: User, desc: "صورة المعرض الدائرية" },
  { key: "cover", label: "الغلاف", icon: ImageIcon, desc: "صورة الـcover العلوية" },
  { key: "gallery", label: "معرض الصور", icon: ImagePlus, desc: "صور داخل المعرض" },
  { key: "stories", label: "القصص", icon: Sparkles, desc: "وصل حديثاً، عروض، تجربة قيادة" },
];

// المكوّن الرئيسي - يُلفّ في Suspense
function ProfileEditContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>("info");

  // Read initial tab from URL
  useEffect(() => {
    const t = params.get("tab") as TabKey | null;
    if (t && TABS.some((x) => x.key === t)) {
      setTab(t);
    }
  }, [params]);

  // Redirects
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/profile/edit");
      return;
    }
  }, [loading, user, router]);

  if (loading || !user || !profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center" dir="rtl">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // التحقق من التوثيق (لكن نسمح للمستخدمين العاديين بـinfo + logo + cover)
  const isVerified =
    isVerifiedNow(profile as any) || (profile as any).isVerifiedDealer === true;

  const ActiveContent = () => {
    switch (tab) {
      case "info":
        return <InfoEditTab />;
      case "logo":
        return <ImageEditTab kind="logo" />;
      case "cover":
        return <ImageEditTab kind="cover" />;
      case "gallery":
        if (!isVerified) {
          return <VerifiedOnlyMessage feature="معرض الصور" />;
        }
        return <GalleryEditTab />;
      case "stories":
        if (!isVerified) {
          return <VerifiedOnlyMessage feature="القصص" />;
        }
        return <StoriesEditTab />;
      default:
        return null;
    }
  };

  return (
    <section className="container py-4 pb-28 sm:py-6 sm:pb-32" dir="rtl">
      {/* Header */}
      <header className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="
            grid h-9 w-9 place-items-center rounded-full
            bg-slate-100 text-slate-700 transition
            hover:bg-slate-200 active:scale-95
            dark:bg-slate-800 dark:text-slate-200
          "
          aria-label="رجوع"
        >
          <ChevronRight size={16} />
        </button>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            تحرير المعرض
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            عدّل بيانات معرضك وصوره
          </p>
        </div>
      </header>

      {/* Tab pills */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <motion.button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              whileTap={{ scale: 0.95 }}
              className={`
                shrink-0 inline-flex items-center gap-1.5 rounded-full
                px-4 py-2 text-[12px] font-black transition
                ${isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              `}
            >
              <Icon size={12} />
              {t.label}
            </motion.button>
          );
        })}
      </div>

      {/* Description of active tab */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {TABS.find((t) => t.key === tab)?.desc}
      </div>

      {/* Active tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <ActiveContent />
      </motion.div>
    </section>
  );
}

function VerifiedOnlyMessage({ feature }: { feature: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-900/40 dark:bg-amber-900/10">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <Sparkles size={20} />
      </div>
      <p className="text-sm font-black text-amber-900 dark:text-amber-200">
        {feature} متاحة للمعارض الموثقة فقط
      </p>
      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
        وثّق معرضك من المحفظة → خطط التوثيق
      </p>
    </div>
  );
}

// ============================================================
// Loading fallback for Suspense
// ============================================================
function LoadingFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center" dir="rtl">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  );
}

// ============================================================
// Page export - wrapped in Suspense
// useSearchParams() requires this wrapping in Next.js 14
// ============================================================
export default function ProfileEditPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProfileEditContent />
    </Suspense>
  );
}
