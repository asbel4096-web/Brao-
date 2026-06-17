/**
 * "شاهدت مؤخراً" — تتبّع الإعلانات التي زارها المستخدم محلياً (localStorage).
 * خفيف، بلا سيرفر، وآمن على SSR (يتحقّق من window).
 */
const KEY = "bratsho:recentlyViewed";
const MAX = 12;

export function recordRecentlyViewed(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const prev = getRecentlyViewed().filter((x) => x !== id);
    const next = [id, ...prev].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* تجاهل (وضع التصفّح الخاص مثلاً) */
  }
}

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
