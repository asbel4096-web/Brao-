import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";

/**
 * W0 security (2026-11-19): server-side ban enforcement for every signed-in API route.
 *
 * Replaces a bare `verifyIdToken(token)`:
 *  - `checkRevoked: true` rejects tokens revoked at ban time (see the ban route) and
 *    tokens of disabled accounts;
 *  - `users/{uid}.banned === true` is rejected even when the ban was set elsewhere
 *    (e.g. from the mobile app's admin panel, which only writes the flag).
 * Callers keep their existing try/catch: any rejection surfaces as their usual auth error.
 */
export class BannedUserError extends Error {
  readonly code = "auth/user-banned";
  constructor() {
    super("الحساب محظور");
  }
}

export async function verifyActiveUserToken(idToken: string): Promise<DecodedIdToken> {
  const app = getAdminApp();
  const decoded = await getAuth(app).verifyIdToken(idToken, true);
  const snap = await getAdminFirestore(app).collection("users").doc(decoded.uid).get();
  if (snap.exists && snap.data()?.banned === true) throw new BannedUserError();
  return decoded;
}
