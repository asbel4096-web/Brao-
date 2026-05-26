import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * منطق المفضلة للساحبات.
 *
 * البنية في Firestore:
 *   users/{uid}/towFavorites/{listingId}
 *
 * كل وثيقة بسيطة تحوي:
 *   - listingId: نفس الـid (سهولة الاستعلام والـbatch reads لاحقاً)
 *   - addedAt: serverTimestamp - للترتيب في الشريط (الأحدث أولاً)
 *
 * لماذا sub-collection وليس array على وثيقة user؟
 *  - النمو غير محدود (Firestore arrays فيها قيود + تحديثها كاملة سيئ).
 *  - يطابق نمط `likedListings` الموجود في القواعد - أقل احتكاك.
 *  - subscribe على الـsub-collection يعطي realtime updates بسلاسة.
 *
 * لا نخزّن بيانات الساحبة (الاسم/الصورة/الهاتف) هنا - دائماً نجلبها من
 * listing الأصل. السبب: لو حدّث صاحب الإعلان رقمه، نريد المستخدم يرى
 * الجديد، وليس snapshot قديم محفوظ في المفضلة.
 */

const SUBCOL = "towFavorites";

/** أضف ساحبة للمفضلة. آمن إذا كانت مضافة مسبقاً (يُحدّث addedAt). */
export async function addTowFavorite(uid: string, listingId: string) {
  await setDoc(
    doc(db, "users", uid, SUBCOL, listingId),
    {
      listingId,
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** أزل ساحبة من المفضلة. آمن إذا كانت غير موجودة. */
export async function removeTowFavorite(uid: string, listingId: string) {
  await deleteDoc(doc(db, "users", uid, SUBCOL, listingId));
}

/**
 * اشترك بقائمة المفضلة realtime.
 * يُمرّر للـcallback مصفوفة listingIds مرتّبة (الأحدث أولاً).
 *
 * نُعيد دالة unsubscribe.
 */
export function subscribeTowFavorites(
  uid: string,
  cb: (ids: string[]) => void
): () => void {
  const colRef = collection(db, "users", uid, SUBCOL);
  return onSnapshot(
    colRef,
    (snap) => {
      // نرتّب client-side حسب addedAt (الأحدث أولاً) لتجنّب index مركّب
      // على collection فرعية صغيرة.
      const items = snap.docs.map((d) => ({
        id: d.id,
        addedAt: d.data().addedAt?.toMillis?.() ?? 0,
      }));
      items.sort((a, b) => b.addedAt - a.addedAt);
      cb(items.map((it) => it.id));
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error("[towFavorites] subscribe error:", err?.code, err?.message);
      // عند الخطأ نُعيد قائمة فارغة - لا نُعطّل بقية الواجهة.
      cb([]);
    }
  );
}
