import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";

/**
 * POST /api/auth/set-credentials
 *
 * يضبط اسم المستخدم + كلمة المرور للحساب الحالي (بعد دخول Google/الهاتف).
 * يستخدم Admin SDK (updateUser) فيعمل بثبات لكل المزوّدات.
 *
 * Body: { username: string, password: string }
 * Header: Authorization: Bearer <Firebase ID token>
 *
 * الخطوات:
 *  1. التحقق من الـID token → uid.
 *  2. التحقق من صيغة اسم المستخدم وكلمة المرور.
 *  3. التأكد أن اسم المستخدم غير محجوز (usernames/{username}).
 *  4. updateUser(uid, { email: <بريد داخلي>, password }).
 *  5. حجز usernames/{username} = { uid } + تحديث users/{uid}.
 */

const LOGIN_EMAIL_DOMAIN = "login.bratsho-car.app";
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

async function getUidFromRequest(
  req: NextRequest
): Promise<{ uid: string | null; stale: boolean }> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { uid: null, stale: false };
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(match[1]);
    // فحص الحداثة: آخر مصادقة خلال آخر 5 دقائق (عمليات حسّاسة).
    const FRESH_WINDOW = 5 * 60; // ثانية
    const authTime = (decoded as any).auth_time as number | undefined;
    const stale =
      typeof authTime === "number"
        ? Date.now() / 1000 - authTime > FRESH_WINDOW
        : true;
    return { uid: decoded.uid || null, stale };
  } catch {
    return { uid: null, stale: false };
  }
}

export async function POST(req: NextRequest) {
  const { uid, stale } = await getUidFromRequest(req);
  if (!uid) return jsonError("غير مصرّح. سجّل الدخول أولاً.", 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const username = String(body?.username || "").trim().toLowerCase();
  const hasPassword = typeof body?.password === "string" && body.password.length > 0;
  const password = hasPassword ? String(body.password) : "";

  // تحقّق من الصيغة (نفس قواعد العميل)
  if (!USERNAME_RE.test(username)) {
    return jsonError("اسم مستخدم غير صالح.", 400);
  }
  if (
    hasPassword &&
    (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
  ) {
    return jsonError("كلمة مرور ضعيفة (8 أحرف على الأقل، حروف وأرقام).", 400);
  }

  const fs = getAdminFirestore(getAdminApp());
  const usernameRef = fs.collection("usernames").doc(username);
  const userRef = fs.collection("users").doc(uid);

  try {
    // 1) تحقّق من توفّر اسم المستخدم (مملوك لنا أو غير محجوز).
    const existing = await usernameRef.get();
    if (existing.exists && existing.data()?.uid !== uid) {
      return jsonError("اسم المستخدم محجوز. اختر اسماً آخر.", 409);
    }

    // إن لم يكن للحساب مزوّد كلمة مرور بعد، فكلمة المرور مطلوبة لأول مرة.
    const authUser = await getAuth().getUser(uid);
    const hasPasswordProvider = authUser.providerData.some(
      (p) => p.providerId === "password"
    );
    if (!hasPasswordProvider && !hasPassword) {
      return jsonError("كلمة المرور مطلوبة عند الإنشاء لأول مرة.", 400);
    }

    // فحص الحداثة يُطبَّق فقط عند **تغيير** بيانات دخول موجودة (لا عند
    // الإنشاء لأول مرة في جلسة دخول حديثة) — مطابقة لسلوك المنصات الكبيرة.
    if (hasPasswordProvider && stale) {
      return NextResponse.json(
        { error: "يلزم تأكيد الهوية قبل تغيير بيانات الدخول.", code: "reauth-required" },
        { status: 401 }
      );
    }

    // 2) لو لهذا الحساب اسم مستخدم سابق مختلف، حرّر القديم.
    const userSnap = await userRef.get();
    const oldUsername = userSnap.data()?.username as string | undefined;
    if (oldUsername && oldUsername !== username) {
      await fs.collection("usernames").doc(oldUsername).delete().catch(() => {});
    }

    // 3) اضبط البريد الداخلي (دائماً) + كلمة المرور (إن وُجدت) عبر Admin SDK.
    const loginEmail = `${username}@${LOGIN_EMAIL_DOMAIN}`;
    await getAuth().updateUser(uid, {
      email: loginEmail,
      ...(hasPassword ? { password } : {}),
    });

    // 4) احجز اسم المستخدم (Admin). لا نكتب users/{uid} هنا حتى لا نُفسد
    //    منطق إنشاء/تحديث الملف في العميل (الذي يضبط uid/isAdmin بنفسه).
    //    العميل يكتب username/usernameSet في ملفه مباشرةً بعد هذا.
    await usernameRef.set(
      { uid, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return NextResponse.json({ ok: true, username });
  } catch (err: any) {
    const code = err?.code || err?.errorInfo?.code || "";
    if (code === "auth/email-already-exists") {
      return jsonError("اسم المستخدم محجوز. اختر اسماً آخر.", 409);
    }
    if (code === "auth/invalid-password") {
      return jsonError("كلمة المرور غير صالحة.", 400);
    }
    // eslint-disable-next-line no-console
    console.error("[set-credentials] failed:", code, err?.message);
    return jsonError("تعذّر حفظ بيانات الدخول. حاول مجدداً.", 500);
  }
}
