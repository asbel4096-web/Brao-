import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { categories } from "@/lib/categories";

/**
 * إدارة صور الأقسام — للأدمن فقط.
 *  GET  → الخريطة الحالية.
 *  POST → { slug, url }  (url=null لحذف صورة قسم).
 * تُحفظ في config/app.categoryImages.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SLUGS = new Set(categories.map((c) => c.slug));

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
    const snap = await fs.collection("config").doc("app").get();
    const images = snap.exists ? snap.data()?.categoryImages || {} : {};
    return NextResponse.json({ ok: true, images });
  } catch (err: any) {
    return jsonError(err?.message || "فشل القراءة", 500);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return jsonError("غير مصرّح — للأدمن فقط", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح", 400);
  }

  const slug = String(body?.slug || "");
  if (!VALID_SLUGS.has(slug)) return jsonError("قسم غير معروف", 400);

  const url = body?.url;
  if (
    url !== null &&
    (typeof url !== "string" ||
      !(url.startsWith("https://") || url.startsWith("http://")))
  ) {
    return jsonError("رابط صورة غير صالح", 400);
  }

  try {
    const fs = getAdminFirestore(getAdminApp());
    await fs.collection("config").doc("app").set(
      {
        categoryImages: {
          [slug]: url === null ? FieldValue.delete() : url,
        },
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الحفظ", 500);
  }
}
