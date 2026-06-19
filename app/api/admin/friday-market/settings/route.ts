import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
  verifyAdminRequest,
  logAdminAction,
} from "@/lib/admin/api-helpers";
import {
  DEFAULT_FRIDAY_SETTINGS,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";

/**
 * GET  /api/admin/friday-market/settings  → الإعدادات الحالية
 * PUT  /api/admin/friday-market/settings  → تحديث الإعدادات (admin)
 *
 * الإعدادات تُخزَّن في config/fridayMarket. القراءة عامة عبر القواعد،
 * لكن نوفّر GET للأدمن لراحة لوحة التحكم. الكتابة server-only.
 */

const PERMISSION = "settings.edit";

function clampInt(v: any, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;

  const fs = getAdminFirestore(getAdminApp());
  const snap = await fs.collection("config").doc("fridayMarket").get();
  const settings: FridayMarketSettings = snap.exists
    ? { ...DEFAULT_FRIDAY_SETTINGS, ...(snap.data() as any) }
    : DEFAULT_FRIDAY_SETTINGS;

  return NextResponse.json({ ok: true, settings });
}

export async function PUT(request: Request) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;
  const caller = res;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة", 400);
  }

  const next: FridayMarketSettings = {
    enabled: body.enabled === true,
    openDay: clampInt(body.openDay, 0, 6, 5),
    openHour: clampInt(body.openHour, 0, 23, 0),
    durationHours: clampInt(body.durationHours, 1, 168, 24),
    bannerTitle: String(body.bannerTitle || "").trim().slice(0, 80) || DEFAULT_FRIDAY_SETTINGS.bannerTitle,
    bannerSubtitle:
      String(body.bannerSubtitle || "").trim().slice(0, 140) ||
      DEFAULT_FRIDAY_SETTINGS.bannerSubtitle,
    bannerImageUrl: body.bannerImageUrl
      ? String(body.bannerImageUrl).trim().slice(0, 600)
      : "",
    showArchive: body.showArchive !== false,
  };

  const fs = getAdminFirestore(getAdminApp());
  try {
    await fs
      .collection("config")
      .doc("fridayMarket")
      .set(
        {
          ...next,
          updatedBy: caller.uid,
          updatedByEmail: caller.email,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر حفظ الإعدادات", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "friday_market_settings_update",
    targetType: "config",
    targetId: "fridayMarket",
    after: next as any,
  });

  return NextResponse.json({ ok: true, settings: next });
}
