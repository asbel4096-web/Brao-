"use client";

import { auth } from "@/lib/firebase";

/**
 * trackEvent - مساعد لتسجيل أحداث الإعلان من العميل.
 *
 * يستدعي /api/listings/track الذي يكتب العدّادات بأمان (Admin SDK).
 * لا يكتب أي شيء مباشرة في Firestore → لا تلاعب ممكن.
 *
 * - يُرفق توكن المستخدم لو مسجّل (لمنع احتساب نقرات المالك).
 * - للزوّار: يُولّد guestKey ثابت في localStorage (dedup المشاهدات).
 * - fire-and-forget: لا يُعطّل واجهة المستخدم لو فشل.
 */

export type TrackEvent =
  | "view"
  | "favorite"
  | "chat"
  | "phone"
  | "whatsapp"
  | "share";

const GUEST_KEY_STORAGE = "bratsho_guest_key";

function getGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem(GUEST_KEY_STORAGE);
    if (!k) {
      k =
        "g" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(GUEST_KEY_STORAGE, k);
    }
    return k;
  } catch {
    return "";
  }
}

export async function trackEvent(
  listingId: string,
  event: TrackEvent
): Promise<void> {
  if (!listingId) return;
  try {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch("/api/listings/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        listingId,
        event,
        guestKey: getGuestKey(),
      }),
      keepalive: true, // يكمل حتى لو غادر المستخدم الصفحة
    });
  } catch {
    /* fire-and-forget: تجاهل الأخطاء */
  }
}
