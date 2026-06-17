"use client";

import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";

/**
 * MaintenanceGate — وضع الصيانة.
 *
 * عند تفعيل ميزة "maintenance" من لوحة الأدمن:
 *  - الزوّار والمستخدمون العاديون يرون شاشة الصيانة.
 *  - الأدمن يتجاوزها (مع شريط تنبيه صغير) ليكمل عمله.
 *  - مسارات /login و /admin تبقى متاحة دائماً حتى لا يُحبَس الأدمن خارج
 *    اللوحة ولا يستطيع إيقاف وضع الصيانة.
 */
const BYPASS_PREFIXES = ["/login", "/admin", "/verify-phone"];

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const maintenance = useFeatureFlag("maintenance");
  const { isAdmin } = useAuth();
  const pathname = usePathname() || "/";

  const bypassPath = BYPASS_PREFIXES.some((p) => pathname.startsWith(p));

  // لا صيانة، أو مسار مستثنى، أو المستخدم أدمن → نعرض التطبيق كالمعتاد.
  if (!maintenance || bypassPath || isAdmin) {
    return (
      <>
        {maintenance && isAdmin && (
          <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-black text-amber-950">
            <Wrench size={13} />
            وضع الصيانة مُفعّل — الزوّار يرون شاشة الصيانة. أنت أدمن فتتجاوزها.
          </div>
        )}
        {children}
      </>
    );
  }

  // شاشة الصيانة للزوّار/المستخدمين.
  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-6 text-center text-white"
    >
      <div className="max-w-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
          <Wrench size={36} className="text-action-400" />
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">التطبيق قيد الصيانة</h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-white/70">
          نُجري بعض التحسينات على براتشو كار لنُقدّم لك تجربة أفضل. نعتذر عن
          الانقطاع المؤقت، وسنعود قريباً.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-action-400" />
          </span>
          نعمل عليها الآن
        </div>
      </div>
    </div>
  );
}
