import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { NotificationType } from "./types";

/**
 * يُنشئ إشعار in-app (في users notifications collection) + يُحفّز push
 * عبر /api/notifications/send.
 *
 * الـpush محاولة best-effort: فشلها لا يُفشل الكتابة الأساسية.
 * المستخدم سيرى الإشعار in-app عند فتح /notifications على أي حال.
 *
 * الـauth: نمرر idToken الحالي للـAPI، الـserver يتحقّق منه قبل الإرسال.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, any>;
}): Promise<void> {
  try {
    // 1) اكتب الـnotification document - الأهم. القائمة الموجودة في
    //    /notifications تعتمد على onSnapshot هذه الـcollection.
    await addDoc(collection(db, "notifications"), {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link || "",
      meta: params.meta || {},
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("createNotification error:", err);
    // لا نُكمل بـpush إذا الكتابة فشلت
    return;
  }

  // 2) حفّز push - best-effort.
  // نتعامل بصمت مع كل الأخطاء: ربما المستخدم لا tokens، أو الإنترنت
  // ضعيف، أو الـAPI route لم تُنشَر. الـin-app notification يكفي.
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      // المستخدم خرج بسرعة - لا حاجة لـpush. الـnotification document
      // كُتب بالفعل، سيُرى لاحقاً.
      return;
    }

    // fire-and-forget: لا await للنتيجة كي لا نُبطّئ الـcaller.
    // إذا فشل الـpush، الإشعار in-app سيكون كافياً.
    void fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        title: params.title,
        body: params.body,
        link: params.link,
        tag: params.type,
      }),
    }).catch(() => {
      /* بصمت - الـin-app notification يكفي */
    });
  } catch {
    /* بصمت */
  }
}
