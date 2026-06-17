import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/admin/today  (أدمن فقط)
 * لقطة لحظية لأرقام اليوم: تسجيلات، إعلانات جديدة، معلّقة، إيراد وشحن اليوم.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REVENUE_TYPES = new Set(["boost", "featured_listing", "vip", "urgent", "verification"]);
const TOPUP_TYPES = new Set(["credit", "topup"]);

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
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [usersSnap, listingsSnap, pendingSnap, txSnap] = await Promise.all([
      fs.collection("users").where("createdAt", ">=", start).limit(1000).get(),
      fs.collection("listings").where("createdAt", ">=", start).limit(1000).get(),
      fs.collection("listings").where("status", "==", "pending").limit(1000).get(),
      fs.collection("walletTransactions").where("createdAt", ">=", start).limit(2000).get(),
    ]);

    let revenueToday = 0;
    let topupsToday = 0;
    txSnap.docs.forEach((d) => {
      const t = d.data() as any;
      const abs = Math.abs(Number(t.amount) || 0);
      if (REVENUE_TYPES.has(t.type)) revenueToday += abs;
      else if (TOPUP_TYPES.has(t.type) && Number(t.amount) > 0) topupsToday += abs;
    });

    // اعتماد/رفض اليوم (من الإعلانات المُحدّثة اليوم)
    let approvedToday = 0;
    let rejectedToday = 0;
    const allListings = await fs
      .collection("listings")
      .where("updatedAt", ">=", start)
      .limit(1000)
      .get()
      .catch(() => null);
    if (allListings) {
      allListings.docs.forEach((d) => {
        const s = (d.data() as any).status;
        if (s === "approved") approvedToday++;
        else if (s === "rejected") rejectedToday++;
      });
    }

    return NextResponse.json({
      ok: true,
      newUsers: usersSnap.size,
      newListings: listingsSnap.size,
      pendingNow: pendingSnap.size,
      revenueToday,
      topupsToday,
      approvedToday,
      rejectedToday,
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل التجميع", 500);
  }
}
