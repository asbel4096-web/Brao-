"use client";

import { auth } from "@/lib/firebase";

/**
 * trackFridayView — يسجّل مشاهدة لإعلان سوق الجمعة (fire-and-forget).
 *
 * - يعيد استخدام نفس guestKey في localStorage المستخدم لتتبّع الإعلانات.
 * - dedup إضافي داخل الجلسة عبر sessionStorage حتى لا نُرسل عند كل re-render.
 * - الخادم يضمن dedup الحقيقي (مرّة لكل زائر) عبر مستند viewers.
 */

const GUEST_KEY_STORAGE = "bratsho_guest_key";

function getGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem(GUEST_KEY_STORAGE);
    if (!k) {
      k = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(GUEST_KEY_STORAGE, k);
    }
    return k;
  } catch {
    return "";
  }
}

export async function trackFridayView(itemId: string): Promise<void> {
  if (!itemId || typeof window === "undefined") return;

  // dedup داخل الجلسة
  try {
    const seenKey = `fm_viewed_${itemId}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
  } catch {
    /* تجاهل */
  }

  try {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch("/api/friday-market/view", {
      method: "POST",
      headers,
      body: JSON.stringify({ itemId, guestKey: getGuestKey() }),
      keepalive: true,
    });
  } catch {
    /* fire-and-forget */
  }
}
