import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import {
  findPaymentMethod,
  MAX_PENDING_PER_USER,
  PAYMENT_METHODS,
  TOPUP_MAX_AMOUNT,
  TOPUP_MIN_AMOUNT,
  type PaymentMethodKey,
} from "@/lib/wallet/topup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/wallet/topup/request
 * Auth: المستخدم نفسه
 * body: { amount, paymentMethod, contactNumber, note? }
 *
 * يُنشئ طلب شحن جديد:
 *  1. فحوص feature flag (wallet)
 *  2. validation: amount, method, contact
 *  3. anti-spam: لا أكثر من 3 طلبات pending
 *  4. كتابة الـrequest doc بحالة "pending"
 *
 * لا يُضاف رصيد هنا - فقط طلب. الرصيد يُضاف عند الموافقة.
 */

export async function POST(request: Request) {
  // Auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError("Unauthorized", 401);
  }
  const idToken = authHeader.slice(7);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken);
  } catch {
    return jsonError("Invalid token", 401);
  }
  const uid = decoded.uid;

  // Body
  let body: {
    amount?: number;
    paymentMethod?: string;
    contactNumber?: string;
    note?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  // Validation
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < TOPUP_MIN_AMOUNT) {
    return jsonError(`الحد الأدنى للشحنة: ${TOPUP_MIN_AMOUNT} BC`, 400);
  }
  if (amount > TOPUP_MAX_AMOUNT) {
    return jsonError(`الحد الأقصى للشحنة الواحدة: ${TOPUP_MAX_AMOUNT} BC`, 400);
  }

  const method = findPaymentMethod(body.paymentMethod || "");
  if (!method) {
    return jsonError("طريقة الدفع غير صالحة", 400);
  }

  const contactNumber = (body.contactNumber || "").trim();
  if (contactNumber.length < 6 || contactNumber.length > 30) {
    return jsonError("رقم التواصل غير صالح", 400);
  }

  const note = (body.note || "").trim().slice(0, 500) || null;

  // Feature flag check
  const flagSnap = await fs.collection("featureFlags").doc("wallet").get();
  if (!flagSnap.exists || flagSnap.data()?.enabled !== true) {
    return jsonError("نظام المحفظة غير مفعَّل حالياً", 403);
  }

  // فحص الحساب
  const userRef = fs.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return jsonError("الحساب غير موجود", 404);
  const userData = userSnap.data() || {};
  if (userData.banned === true || userData.disabled === true) {
    return jsonError("الحساب موقوف", 403);
  }

  // Anti-spam: عدد الطلبات المعلَّقة
  const pendingSnap = await fs
    .collection("topupRequests")
    .where("userId", "==", uid)
    .where("status", "==", "pending")
    .limit(MAX_PENDING_PER_USER + 1)
    .get();

  if (pendingSnap.size >= MAX_PENDING_PER_USER) {
    return jsonError(
      `لديك ${pendingSnap.size} طلبات قيد المراجعة. انتظر مراجعتها أولاً.`,
      400
    );
  }

  // إنشاء الطلب
  const reqRef = fs.collection("topupRequests").doc();
  await reqRef.set({
    userId: uid,
    userEmail: userData.email || "",
    userName: userData.businessName || userData.name || "",
    userPhone: userData.phone || "",
    amount,
    paymentMethod: method.key,
    paymentMethodLabel: method.label,
    contactNumber,
    note,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    requestId: reqRef.id,
    amount,
    status: "pending",
  });
}
