import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return "السعر عند الطلب";
  return new Intl.NumberFormat("ar-LY").format(n) + " د.ل";
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-LY").format(n);
}

/** Normalize Libyan phone to international (218...) format for wa.me links */
export function normalizeLibyanPhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("218")) return digits;
  if (digits.startsWith("0")) return "218" + digits.slice(1);
  return "218" + digits;
}

export function timeAgo(ts?: Timestamp | null): string {
  if (!ts) return "الآن";
  try {
    const date = ts.toDate();
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "الآن";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `منذ ${diffDay} يوم`;
    const diffMon = Math.floor(diffDay / 30);
    if (diffMon < 12) return `منذ ${diffMon} شهر`;
    return `منذ ${Math.floor(diffMon / 12)} سنة`;
  } catch {
    return "—";
  }
}

export function formatDateTime(ts?: Timestamp | null): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Deterministic chatId from listing + two users (sorted) */
export function buildChatId(uidA: string, uidB: string, listingId: string): string {
  const [u1, u2] = [uidA, uidB].sort();
  return `${listingId}__${u1}__${u2}`;
}

export function truncate(text: string, max = 60): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
