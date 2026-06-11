import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import {
  TRANSFER_MIN_BC,
  TRANSFER_MAX_BC,
  MAX_TRANSFERS_PER_DAY,
  normalizePhoneForSearch,
} from "@/lib/wallet/transfer";

/**
 * التحقق من الـID token وإرجاع الـuid.
 * مستقل عن api-helpers (التي قد لا تحوي verifyAuthToken).
 */
async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(match[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/wallet/transfer
 *
 * Body: { recipientPhone: string, amount: number, note?: string }
 *
 * يتحقق من:
 *  - المستخدم مسجّل (Auth token)
 *  - المبلغ ضمن الحدود (10-1000)
 *  - المستلم موجود (بحث بالهاتف)
 *  - ليس تحويلاً للنفس
 *  - رصيد المرسِل كافٍ
 *  - لم يتجاوز 5 تحويلات اليوم
 *
 * كل العمليات atomic عبر Firestore transaction:
 *  1. قراءة رصيد المرسِل
 *  2. خصم المبلغ من المرسِل
 *  3. إضافة المبلغ للمستلم
 *  4. كتابة سجل التحويل (walletTransfers)
 *  5. كتابة معاملتين (walletTransactions): transfer_out + transfer_in
 *  6. إشعار للمستلم
 */

export async function POST(req: NextRequest) {
  try {
    // 1. التحقق من الهوية
    const senderUid = await getUidFromRequest(req);
    if (!senderUid) {
      return jsonError("غير مصرّح", 401);
    }

    // 2. قراءة الـbody
    const body = await req.json().catch(() => ({}));
    const recipientPhoneRaw = String(body.recipientPhone || "").trim();
    const amount = Number(body.amount);
    const note = String(body.note || "").trim().slice(0, 140);

    // 3. فحوص المبلغ
    if (!Number.isInteger(amount) || amount <= 0) {
      return jsonError("مبلغ غير صحيح", 400);
    }
    if (amount < TRANSFER_MIN_BC) {
      return jsonError(`الحد الأدنى ${TRANSFER_MIN_BC} BC`, 400);
    }
    if (amount > TRANSFER_MAX_BC) {
      return jsonError(`الحد الأقصى ${TRANSFER_MAX_BC} BC`, 400);
    }

    if (!recipientPhoneRaw) {
      return jsonError("رقم هاتف المستلم مطلوب", 400);
    }

    const recipientPhone = normalizePhoneForSearch(recipientPhoneRaw);

    getAdminApp();
    const db = getAdminFirestore();

    // 4. البحث عن المستلم بالهاتف
    // نبحث عن كل الصيغ الممكنة (التطبيع قد يختلف عن المخزَّن)
    const recipientQuery = await db
      .collection("users")
      .where("phone", "in", [
        recipientPhone,
        recipientPhoneRaw,
        "+218" + recipientPhone.slice(1),
        "218" + recipientPhone.slice(1),
      ])
      .limit(1)
      .get();

    if (recipientQuery.empty) {
      return jsonError("لا يوجد مستخدم بهذا الرقم", 404);
    }

    const recipientDoc = recipientQuery.docs[0];
    const recipientUid = recipientDoc.id;
    const recipientData = recipientDoc.data();

    // 5. منع التحويل للنفس
    if (recipientUid === senderUid) {
      return jsonError("لا يمكنك التحويل لنفسك", 400);
    }

    // 6. فحص الحد اليومي (5 تحويلات)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransfers = await db
      .collection("walletTransfers")
      .where("senderUid", "==", senderUid)
      .where("createdAt", ">=", startOfDay)
      .get();

    if (todayTransfers.size >= MAX_TRANSFERS_PER_DAY) {
      return jsonError(
        `تجاوزت الحد اليومي (${MAX_TRANSFERS_PER_DAY} تحويلات)`,
        429
      );
    }

    // 7. Transaction atomic
    const senderRef = db.collection("users").doc(senderUid);
    const recipientRef = db.collection("users").doc(recipientUid);

    const result = await db.runTransaction(async (tx) => {
      const senderSnap = await tx.get(senderRef);
      if (!senderSnap.exists) {
        throw new Error("حساب المرسِل غير موجود");
      }

      const senderData = senderSnap.data() || {};
      const senderBalance = Number(senderData.balance || 0);

      // فحص الرصيد
      if (senderBalance < amount) {
        throw new Error("رصيدك غير كافٍ");
      }

      const senderName =
        senderData.businessName ||
        senderData.dealerName ||
        senderData.name ||
        "مستخدم";
      const recipientName =
        recipientData.businessName ||
        recipientData.dealerName ||
        recipientData.name ||
        "مستخدم";

      // خصم من المرسِل
      tx.update(senderRef, {
        balance: FieldValue.increment(-amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // إضافة للمستلم
      tx.update(recipientRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // سجل التحويل
      const transferRef = db.collection("walletTransfers").doc();
      tx.set(transferRef, {
        senderUid,
        senderName,
        senderPhone: senderData.phone || null,
        recipientUid,
        recipientName,
        recipientPhone: recipientData.phone || null,
        amount,
        note: note || null,
        status: "completed",
        createdAt: FieldValue.serverTimestamp(),
      });

      // معاملة خصم للمرسِل
      const outTxRef = db.collection("walletTransactions").doc();
      tx.set(outTxRef, {
        userId: senderUid,
        type: "transfer_out",
        amount: -amount,
        reason: `تحويل إلى ${recipientName}`,
        relatedUid: recipientUid,
        transferId: transferRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      // معاملة إضافة للمستلم
      const inTxRef = db.collection("walletTransactions").doc();
      tx.set(inTxRef, {
        userId: recipientUid,
        type: "transfer_in",
        amount: amount,
        reason: `تحويل من ${senderName}`,
        relatedUid: senderUid,
        transferId: transferRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      // إشعار للمستلم
      const notifRef = db.collection("notifications").doc();
      tx.set(notifRef, {
        userId: recipientUid,
        type: "wallet_transfer",
        title: "وصلك رصيد جديد 💰",
        body: `استلمت ${amount} BC من ${senderName}`,
        read: false,
        link: "/wallet",
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        recipientName,
        newSenderBalance: senderBalance - amount,
      };
    });

    return Response.json({
      success: true,
      amount,
      recipientName: result.recipientName,
      newBalance: result.newSenderBalance,
    });
  } catch (err: any) {
    const msg = err?.message || "فشل التحويل";
    // أخطاء معروفة → 400، غيرها → 500
    const known = [
      "رصيدك غير كافٍ",
      "حساب المرسِل غير موجود",
      "لا يمكنك التحويل لنفسك",
    ];
    return jsonError(msg, known.includes(msg) ? 400 : 500);
  }
}
