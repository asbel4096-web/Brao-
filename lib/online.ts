import type { Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";

/** A user is considered "online" if seen within this window. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function toMillis(ts?: Timestamp | null): number | null {
  if (!ts) return null;
  try {
    if (typeof (ts as Timestamp).toMillis === "function") {
      return (ts as Timestamp).toMillis();
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Decide whether a profile is online.
 * Priority: a fresh `lastSeenAt` (within 5 min) wins; otherwise fall back
 * to the explicit `isOnline` flag. This keeps things correct even when the
 * web client cannot reliably flip `isOnline` to false on tab close.
 */
export function isProfileOnline(
  profile?: Pick<UserProfile, "isOnline" | "lastSeenAt"> | null,
  nowMs = Date.now()
): boolean {
  if (!profile) return false;
  const lastSeenMs = toMillis(profile.lastSeenAt);
  if (lastSeenMs != null) {
    return nowMs - lastSeenMs <= ONLINE_WINDOW_MS;
  }
  return profile.isOnline === true;
}

function lastSeenAgoText(lastSeenMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - lastSeenMs) / 1000));
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `آخر ظهور منذ ${Math.max(1, diffMin)} دقيقة`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `آخر ظهور منذ ${diffHr} ساعة`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `آخر ظهور منذ ${diffDay} يوم`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `آخر ظهور منذ ${diffMon} شهر`;
  return `آخر ظهور منذ ${Math.floor(diffMon / 12)} سنة`;
}

/**
 * Human-readable Arabic activity status:
 *  - online            -> "متصل الآن"
 *  - offline + lastSeen -> "آخر ظهور منذ ..."
 *  - offline, no data   -> "غير متصل"
 */
export function onlineStatusText(
  profile?: Pick<UserProfile, "isOnline" | "lastSeenAt"> | null,
  nowMs = Date.now()
): string {
  if (isProfileOnline(profile, nowMs)) return "متصل الآن";
  const lastSeenMs = toMillis(profile?.lastSeenAt ?? null);
  if (lastSeenMs != null) return lastSeenAgoText(lastSeenMs, nowMs);
  return "غير متصل";
}

/** Short label used in the compact stat card. */
export function onlineShortLabel(
  profile?: Pick<UserProfile, "isOnline" | "lastSeenAt"> | null,
  nowMs = Date.now()
): string {
  return isProfileOnline(profile, nowMs) ? "متصل الآن" : "غير متصل";
}
