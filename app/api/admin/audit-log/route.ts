import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/admin/audit-log  (أدمن فقط)
 * يقرأ adminLogs (من فعل ماذا ومتى) ويحلّ أسماء المنفّذين.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isAdmin(req: NextRequest): Promise<boolean> {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(m[1]);
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs.collection("users").doc(decoded.uid).get();
    return snap.exists && snap.data()?.isAdmin === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return jsonError("غير مصرّح — للأدمن فقط", 403);

  try {
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs
      .collection("adminLogs")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    // حلّ أسماء المنفّذين (uid فريدة).
    const uids = Array.from(
      new Set(snap.docs.map((d) => (d.data() as any).adminUid).filter(Boolean))
    );
    const names: Record<string, string> = {};
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const u = await fs.collection("users").doc(uid).get();
          names[uid] = u.exists ? (u.data() as any).name || "أدمن" : "أدمن";
        } catch {
          names[uid] = "أدمن";
        }
      })
    );

    const items = snap.docs.map((d) => {
      const t = d.data() as any;
      return {
        id: d.id,
        action: t.action || "",
        adminUid: t.adminUid || "",
        adminName: names[t.adminUid] || "أدمن",
        targetUid: t.targetUid || t.uid || null,
        details: t.details ? JSON.stringify(t.details) : null,
        at: t.createdAt?.toMillis?.() || 0,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return jsonError(err?.message || "فشل القراءة", 500);
  }
}
