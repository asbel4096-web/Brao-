/**
 * W0 security (2026-11-19): only same-site relative paths may be used as a post-login redirect.
 *
 * `?redirect=` / `?next=` come from the URL, so anyone can craft a link such as
 * `/login?redirect=https://evil.example` or `//evil.example`. Next.js navigates to absolute
 * URLs as-is, so without this check a signed-in user was sent off-site the moment the page loaded.
 *
 * Accepted: "/path", "/path?x=1#y" — returned normalised, with its percent-encoding kept.
 * Rejected (→ fallback): absolute URLs, scheme-relative "//", backslashes (browsers treat "\"
 * like "/"), control characters and malformed escapes. The value is checked as given, decoded,
 * and again after normalisation, because dot segments can collapse into "//host"
 * (e.g. "/.//evil.example" normalises to "//evil.example").
 */
const BACKSLASH = String.fromCharCode(92);
const BASE = "https://bratsho.invalid";

function isPlainPath(v: string): boolean {
  if (!v.startsWith("/") || v.startsWith("//") || v.includes(BACKSLASH)) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 32 || c === 127) return false;
  }
  return true;
}

/** The value and its decoded form are both plain same-site paths. */
function isSafePath(v: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(v);
  } catch {
    return false;
  }
  return isPlainPath(v) && isPlainPath(decoded);
}

export function safeRedirect(value: string | null | undefined, fallback = "/"): string {
  if (!value || typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!isSafePath(raw)) return fallback;
  try {
    const u = new URL(raw, BASE);
    if (u.origin !== BASE) return fallback;
    const out = u.pathname + u.search + u.hash;
    return isSafePath(out) ? out : fallback;
  } catch {
    return fallback;
  }
}
